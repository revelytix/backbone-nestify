# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting Backbone Models and Collections.

It provides two features:

* Specify the mapping between [Model](http://backbonejs.org/#Model) attributes names and the nested Model (or [Collection](http://backbonejs.org/#Collection)) constructors, in order to dynamically deserialize nested JSON into the proper tree of nested Model/Collection instances.

```javascript
var ShoppingCart = Backbone.Model.extend(
    _.extend({
        /* Model definition... */
    }, nestify({
        "account":{constructor:Account},
        "pending":{constructor:Order}
    }))
);
```

* Syntactic sugar is provided to easily get and set these nested Models and Collections.

```javascript
var item3 = cart.get(["account", "orders", 0, "items", 3]); // an Item Model instance

cart.set("account|orders|0|items|3|id", 50]); // Third Item now has an id of 50
```

## Useful If

If you are constrained to an API which uses deeply nested trees of entities, which can perhaps be composed and reused in different combinations, then this plugin may help you to work with a corresponding set of custom Backbone Models and Collections. The plugin was designed especially to make serialization to and from JSON work seamlessly, as well as providing the convenience syntax for working with nested Model or Collection attributes.


## Usage

Backbone Nestify depends only on Backbone and [Underscore](http://underscorejs.org/). It is a model mixin; any model definition can have this functionality added like so:

```javascript

var Account = Backbone.Model.extend(
    _.extend({
        /* Model definition... */
    }, nestify({
        "orders":{constructor:Orders}
    }))
);
```

### Under the Hood

The plugin works by replacing the [get](http://backbonejs.org/#Model-get) and [set](http://backbonejs.org/#Model-set) methods of the Model (or Collection) definitions. The replacement methods delegate to the original methods to provide the usual Backbone functionality, and they add the additional functionality provided by this plugin.

```javascript
var spec = nestify({
    'orders':{constructor:Orders}
});

_.keys(spec); // ["get","set"]
```

### Nestify Spec

The plugin provides an API for creating a nesting specification. The spec can then be set on individual Model instances or Model class constructors. Broadly speaking, the spec is a mapping from Model attribute names to the nested Model or Collection class for those attributes. 

```javascript
var Order = Backbone.Model.extend(...
    Account = Backbone.Model.extend(...
    
var shoppingCartSpec = nestify({
    pending: {constructor: Order},
    account: {constructor: Account}
});

var ShoppingCart = Backbone.Model.extend(shoppingCartSpec);
```

A more realistic scenario is to add the spec to other custom properties.

```javascript
var ShoppingCart = Backbone.Model.extend(_.extend({
    // ...custom stuff...
}, shoppingCartSpec));
```

Recall that the spec is just an object containing customized get and set methods. You could add it directly to a Model instance instead of a Model class definition, if you want.

```javascript
var shoppingCart = new Backbone.Model();

_.extend(shoppingCart, shoppingCartSpec);
```


### Nestify Getter/Setter syntax

Nestify customizes the Backbone Model the [get](http://backbonejs.org/#Model-get) and [set](http://backbonejs.org/#Model-set) methods to provide a convenient syntax to access the nested attributes of a nestified Model.

Getting nested attributes, array syntax:

```javascript
shoppingCart.get(["pending","items",0,"itemID"]);
```

Getting nested attributes, delimited String syntax:

```javascript
shoppingCart.get("account|orders|1|items|0|itemID");
```

Setting nested attributes, array syntax:

```javascript
shoppingCart.set(["pending","items",0,"itemID"], "abc123");
```

Setting nested attributes, delimited String syntax:

```javascript
shoppingCart.set("account|orders|1|items|0|itemID","abc123");
```

### Example

For this and following examples, let's say you have JSON like this:

```javascript
var shoppingCartJSON = 
        {pending: 
         {orderID:null,
          items:[{itemID:"bk28",
                  qty:25,
                  desc:"AA batteries"}]},
         account: 
         {acctID:55,
          uname:"bmiob",
          orders:[
              {orderID:1,
               items:[{itemID:"cc01",
                       qty:2,
                       desc:"meatball"},
                      {itemID:"cc25",
                       qty:87,
                       desc:"rhubarb"}]},
              {orderID:2,
               items:[{itemID:"sd23",
                       desc:"SICP"}]}
          ]}
        };
```

To work with this, you could spec out model nesting as follows:

```javascript
/*
 specs:

 ShoppingCart
 - "pending"      => Order   0..1
 - "account"      => Account 1

 Account
 - "orders"       => [Order] 0..*

 Order
 - "items"        => [Item]  0..*
 */

var Item = Backbone.Model;
var Items = Backbone.Collection.extend({model:Item});
var Order = Backbone.Model.extend(nestify({
    items: {constructor:Items}
}));
var Orders = Backbone.Collection.extend({model:Order});
var Account = Backbone.Model.extend(nestify({
    orders: {constructor:Orders}
}));
var ShoppingCart = Backbone.Model.extend(nestify({
    pending: {constructor: Order},
    account: {constructor: Account}
}));
```

With these Model and Collection definitions in place, a Model instance for this JSON can be constructed in the usual Backbone manner:

```javascript
var shoppingCart = new ShoppingCart(shoppingCartJSON);

// or alternatively...

var shoppingCart = new ShoppingCart();
shoppingCart.set(shoppingCartJSON);
```

Nested attributes can be accessed with the special syntax.

```javascript
var anItem = shoppingCart.get("account|orders|1|items|0");

expect(anItem).to.be.an.instanceof(Item);
expect(anItem.get("itemID")).to.equal("sd23");
```



## Development

    $ npm install
    $ grunt [dist]
