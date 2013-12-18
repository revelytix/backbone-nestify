# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting Backbone [Models](http://backbonejs.org/#Model) and [Collections](http://backbonejs.org/#Collection). It depends only on Backbone and [Underscore](http://underscorejs.org/). 

It provides two features:

* A syntax to more easily nest, and access, attributes within nested Models and Collections.

```javascript
var item3 = shoppingCart.get("items|3"); 
// returns the nested item Model instance

shoppingCart.set("items|3|id", 50]); 
// Third item now has an id of 50
```

* An API to specify the nesting that should take place.

```javascript
var spec = {
    "account":AccountModel,
    "items":ItemCollection,
};

var mixin = nestify(spec);

var ShoppingCartModel = Backbone.Model.extend(mixin);
```

### Usage

At it's most basic: you provide nestify with a spec and receive a mixin. 

```javascript
var spec = {...};

var mixin = nestify(spec);

var MyModel = Backbone.Model.extend(mixin);
```

The mixin can be added to any Model definition or instance. 

## Example

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
 a ShoppingCart has:
 - "pending"      => Order   0..1
 - "account"      => Account 1

 an Account has:
 - "orders"       => [Order] 0..*

 an Order has:
 - "items"        => [Item]  0..*
 */

// nestable Model, Collection definitions
var Item = Backbone.Model;
var Items = Backbone.Collection.extend({model:Item});
var Order = Backbone.Model.extend(nestify({
    'items': Items
}));
var Orders = Backbone.Collection.extend({model:Order});
var Account = Backbone.Model.extend(nestify({
    'orders': Orders
}));
var ShoppingCart = Backbone.Model.extend(nestify({
    'pending': Order,
    'account': Account
}));
```

With these Model and Collection definitions in place, a Model instance for this JSON can be constructed in the usual Backbone manner:

```javascript
var shoppingCart = new ShoppingCart(shoppingCartJSON);

// or alternatively...

shoppingCart.set(shoppingCartJSON);
```

Nested attributes can be accessed with the nestify syntax (which is configurable).

```javascript
var anItem = shoppingCart.get("account|orders|1|items|0");

expect(anItem).to.be.an.instanceof(Item);
expect(anItem.get("itemID")).to.equal("sd23");
```

## Nestify Getter/Setter syntax

Nestify customizes the Backbone Model the [get](http://backbonejs.org/#Model-get) and [set](http://backbonejs.org/#Model-set) methods to provide a convenient syntax to access the nested attributes of a nestified Model.

### Getting

Nested attributes can be accessed using an array syntax, where each item in the array corresponds with a level of nesting:

```javascript
shoppingCart.get(["pending","items",0,"itemID"]);
```

Or there is an equivalent stringified syntax using a delimited string:

```javascript
shoppingCart.get("pending|items|0|itemID");
```

(The delimiter is configurable.)

```javascript
shoppingCart.get("pending.items.0.itemID", {delim:"."});
```

Both of the above are shorthand for the manual way of accessing nested attributes using ordinary Backbone syntax:

```javascript
shoppingCart.get("pending")
            .get("items")
            .at(0)
            .get("itemID");
```

### Setting

Nested attributes can be set with the array syntax:

```javascript
shoppingCart.set(["pending","items",0,"itemID"], "abc123");
```

...or the (configurable) delimited string syntax:

```javascript
shoppingCart.set("pending,items,0,itemID", "abc123", {delim: ",");
```

And in fact both of these are equivalent to just setting JSON on the model:

```javascript
shoppingCart.set({pending: {items: [{itemID:"abc123"}]}});
```

### Unset and Clear

Backbone Model's [unset](http://backbonejs.org/#Model-unset) and [clear](http://backbonejs.org/#Model-clear) methods are both supported. The unset function supports nestify's extended syntax:

```javascript
shoppingCart.unset("orders|0|items|2|backOrdered");
```

## Nestify Spec

The plugin provides an API which accepts a nesting specification. The resulting mixin can then be set on individual Model instances or Model class constructors. Broadly speaking, the spec is a mapping from Model attribute names to the nested Model or Collection class for those attributes. 

In other words, a Model (or Collection) definition (or instance) is nestified once, up front. Thereafter, any modifications to instances of that Model will adhere to the nesting specification. This is particularly good for dynamically deserializing complex JSON into the proper tree of nested Model/Collection instances.

```javascript
var Order = Backbone.Model.extend(...
    Account = Backbone.Model.extend(...

var shoppingCartSpec = {
    pending: {constructor: Order},
    account: {constructor: Account}
};

var shoppingCartMixin = nestify(shoppingCartSpec);

var ShoppingCart = Backbone.Model.extend(shoppingCartMixin);
```

A more realistic scenario is to add the spec to other custom properties. (Note the use of Underscore's [extend](http://underscorejs.org/#extend) function.)

```javascript
var ShoppingCart = Backbone.Model.extend(_.extend({
    // ...custom stuff...
}, shoppingCartMixin));
```

### Applying the Mixin

The mixin, once produced, can be added to a Backbone Model or Collection definition or instance using any of the ordinary means provided by Backbone. It can be included in the Model definition like so:

```javascript
var ShoppingCart = Backbone.Model.extend(_.extend({
    // ...model definition...
}, mixin));
```

Which would be equivalent to modifying the prototype of an existing Model (or Collection) constructor function:

```javascript
_.extend(ShoppingCart.prototype, mixin);
```

It can be mixed in directly to a Model or Collection instance, if need be.

```javascript
var shoppingCart = new Backbone.Model();

_.extend(shoppingCart, mixin);
```

## Options

Nestify options, like Backbone options, are a simple hash of name/value pairs. They can be specified by either of the following ways:

* When calling nestify(), pass an options hash as a second (optional) parameter. These options are in effect for the lifetime of the mixin.

```javascript
var mixin = nestify(spec, {delim:"."});
```

* Piggybacking on Backbone options when calling get() or set(). These options are only in effect for the duration of the method call; they will override any options specified to the nestify() function.

```javascript
shoppingCart.get("pending.items.0.itemID", {delim:"."});
```

### delim

The `delim` option can be used to specify the delimeter to use in the stringified syntax. By default this delimiter is the pipe character `|`.

```javascript
shoppingCart.get("pending|items|0|itemID");
// or
shoppingCart.get("pending.items.0.itemID", {delim:"."});
```

### coll

The `coll` option gives fine-grained control over the updating of nested Backbone Collections. The possible values are `reset`, `set`, and the default value `at`. 
* reset - a nested Collection is updated using its [reset](http://backbonejs.org/#Collection-reset) method, which completely replaces its contents.
* set - a nested Collection is updated using its [set](http://backbonejs.org/#Collection-set) method, which performs a Backbone "smart" update. (See [documentation](http://backbonejs.org/#Collection-set) for additional Backbone options that can be paired with this one.)
* at - the default and most precise behavior: a nested Collections values are overwritten individually, in place by index, via it's [at](http://backbonejs.org/#Collection-at) method.

This option is best illustrated by an example. To see it in action, let's say the items of an existing order are being updated.

```javascript
var order = new Order({items:[{id:1,desc:"bread"}, 
                              {id:2,desc:"cheese"}]});
```

#### reset

Resetting the Items...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {coll:"reset"});
```
...results in the order now having a single 'butter' Item.

#### set

Setting the Items and taking advantage of Backbone's `{remove:false}` option...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {coll:"set", remove:false});
```
...will do a Collection smart merge, resulting in the order now having all three Items.

#### at

Updating the Items with `{coll:'at'}`...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {coll:"at"});
```
...will replace the first Item in the Collection (bread) with a new first Item (butter). The second item could be replaced instead (note the `null` in the array):
```javascript
order.set({items:[null,{id:3,desc:"butter"}]}, {coll:"at"});
```
...which would be equivalent to using the nestify syntax:
```javascript
order.set("items|1|", {id:3,desc:"butter"});
```

## Under the Hood

The plugin works by replacing the [get](http://backbonejs.org/#Model-get) and [set](http://backbonejs.org/#Model-set) methods of the Model (or Collection) definitions. The replacement methods delegate to the original methods to provide the usual Backbone functionality, and they add the additional functionality provided by this plugin. The mixin is just an ordinary object containing these two methods.

```javascript
var mixin = nestify({
   ...
});

_.keys(mixin); // ["get","set"]
```

## Useful If

If you are constrained to an API which uses deeply nested trees of entities, which can perhaps be composed and reused in different combinations, then this plugin may help you to work with a corresponding set of custom Backbone Models and Collections. The plugin was designed especially to make serialization to and from JSON work seamlessly, as well as providing the convenience syntax for working with nested Model or Collection attributes.

## Development

    $ npm install
    $ grunt [dist]
