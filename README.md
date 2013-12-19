# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting Backbone [Models](http://backbonejs.org/#Model) and [Collections](http://backbonejs.org/#Collection). It depends only on Backbone and [Underscore](http://underscorejs.org/). 

## Download
* [0.2.0 release](dist/backbone-nestify-0.2.0.min.js?raw=true) - minified, 4kb
* [0.2.0 release](dist/backbone-nestify-0.2.0.js?raw=true) - 23 kb

## Features

Backbone Nestify provides two features:

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

The plugin provides an API which accepts a nesting **spec**. The resulting **mixin** can then be set on individual Model instances or Model class constructors. Broadly speaking, the spec is a mapping from Model attribute names to the nested Model or Collection class for those attributes. 

In other words, a Model (or Collection) definition (or instance) is nestified once, up front. Thereafter, any modifications to instances of that Model will adhere to the nesting specification. This is particularly good for dynamically deserializing complex JSON into the proper tree of nested Model/Collection instances.

In this illustration, a ShoppingCart Model is nestified. Two of its attributes are paired with the desired nested Model types (Order and Account, respectively).
```javascript
var Order = Backbone.Model.extend(...
    Account = Backbone.Model.extend(...

var shoppingCartSpec = {
    'pending': Order,
    'account': Account
};

var shoppingCartMixin = nestify(shoppingCartSpec);

var ShoppingCart = Backbone.Model.extend(shoppingCartMixin);
```

A more typical scenario is to combine the mixin with other custom properties when defining a Model definition. (Note the use of Underscore's [extend](http://underscorejs.org/#extend) function.)

```javascript
var ShoppingCart = Backbone.Model.extend(_.extend({
    // ...custom properties...
}, shoppingCartMixin));
```

Once nestified, the ShoppingCart Model is ready to be used.
```javascript
var cart = new ShoppingCart();
cart.set("pending|id", 5);
cart.get("pending"); // returns an Order instance with an 'id' of 5
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

### Deep Nesting

Nestifying is not confined to the top-level Model only. The nested Model and Collection types can themselves be nestified (as can be seen in the [Example](#example)).

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

## Advanced Spec

In the examples so far, the **spec** has always been a simple **hash** of Model attributes to nested Model or Collection **container** types. This _abbreviated_ form is expected to be the typical, 80% use case.

```javascript
var shoppingCartSpec = {
    'pending': Order,
    'account': Account
};
```

But it is possible to opt-in to a more verbose but powerful _general_ spec form.


### General Form

The general spec form has the following structure (in pseudo-BNF):

```
// The full-blown, general 'spec' is actually an array of specs.
<speclist>    ::= [ spec ]

<spec>        ::= { match: <matcher>, /* optional; omitted means 'match 
                                         any/all attribute names' */
                    container: <container> }
                | { hash: <hash> }
                
<hash>        // this is just the abbreviated 'hash' spec form

<matcher>     ::= String
                | RegExp
                | Function  // predicate

<container>   ::= <Constructor>
                | {constructor: <constructor>,
                   args       : <arguments to constructor>, // optional 
                   spec       : <speclist>                  // optional
                | Function // "arbitrary" container

<constructor> ::= <Backbone Model constructor Function> 
                | <Backbone Collection constructor Function>
```


### Hash

By passing an **array** to Nestify, you are opting-in to the advanced spec form; you cannot use the abbreviated hash form. But, you can still explicitly supply a hash thusly:

```javascript
// advanced form, explicit 'hash'
var spec = [{hash: {account: AccountModel,
                    orders: OrdersCollection}}];

// equivalent to abbreviated form:
var spec = {account: AccountModel,
            orders: OrdersCollection}}
```

A hash can be thought of as the degenerate form of the more general, more powerful pairing of **matchers** and a **containers**.

### Matcher

An alternative to the hash is a **matcher**/**container** pair. A matcher can be used to match on any of the containing Model's attributes; The container specifies what sort of object should be stored for that attribute, to contain nested attributes.

#### String

A String matcher implies doing a `===` match on the attribute name.

```javascript
{match: "foo",
 container: FooModel}

// equivalent to
{hash: {'foo': FooModel}}
```

#### RegExp

A JavaScript RegExp can be used as a matcher for more powerful attribute matching.

```javascript
{match: /ord/,
 container: OrderModel}
```

#### Function

For maximum matching capability, a JavaScript Function can be used.

```javascript
var len=3;

//...
{match: function(attr, val, existing, opts){
    return attr.length === len;
 },
 container: OrderModel}
```

The supplied matcher function will be passed these parameters: 

* The String `attribute` name
* The incoming, unmodified container `value` to be set
* The `existing` container, if any
* The `opts` hash

#### Omitted

The matcher can be omitted entirely; this means "match all attributes".

```javascript
// will match everything
{container: EverythingModel}
```

### Container

Conceptually speaking, a **container** is anything that can hold a nested value. It is a Model attribute which Nestify can use to nest attributes. It can be any of: `Backbone Model`, `Backbone Collection`, `Function`, `Array`, `Object`.

All containers can be indexed using the [getter/setter syntax](#nestify-gettersetter-syntax).

#### Array or Object

Backbone itself already allows simple nesting via native JavaScript Arrays and Objects; Nestify simply provides its getter/setter syntactic sugar on top of this. In fact, using an empty spec such as this:

```javascript
var Model = Backbone.Model.extend(nestify());
```

...will still nestify the Model and allow the use of Nestify's getter/setter syntax. It simply will not change the storage of those nested attributes; they will continue to be stored in plain Objects or Arrays.

```javascript
var m = new Model({
    orders: [{id: 1}]
});

m.get("orders|0|id"); //returns 1
m.get("orders|0");    //returns an Object
m.get("orders");      //returns an Array

```

#### Model or Collection

Specifying that a container should be a Backbone Model or Collection is the expected majority use case; just use the constructor Function, like so:

```javascript
var spec = [{match: "account",
             container: AccountModel},
            {match: "orders",
             container: OrdersCollection}];
             
// equivalent to:
var spec = [{hash: {account: AccountModel,
                    orders: OrdersCollection}}];
// and
var spec = {account: AccountModel,
            orders: OrdersCollection}}

```

Specifying arguments to the Backbone constructor, and/or specifying a Nestify spec for instances of that Backbone container, can be accomplished like this:

```javascript
var spec = [{match: "account",
             container: {constructor: AccountModel,
                         args: {preferred: true},
                         spec: {rewards: RewardCollection}
                        }];
```

#### Function

For utmost flexibility, a `container` can be a Function. 

The supplied function will be passed five parameters: 

* The incoming, unmodified container `value` to be set (for example, raw JSON)
* The `existing` container, if any
* The `opts` hash
* The String `attribute` name
* The containing Backbone `Model`

The function should return the resulting `container` object.

```javascript
var spec = [{match: "account",
             container: function(v, existing, opts, att, m){
                 return new AmazingModel(v, opts);
             }
            }];
```

### Example

A full-blown example of the Advanced Spec Form:

```javascript
    nestify([{
        hash: {foo: FooModel,
               bar: BarModel}
    },{
        match: /abc/,
        container: BarModel
    },{
        match: function(...){return true;},
        container: function(...){return something;}
    },{
        // default case, no 'matcher'
        container: {
            constructor: BazModel,
            args: {argle:"bargle"},
            spec: [...BazModel's own spec...]
        }
    }],{ // optional 'opts' arg
        delim: "."
    });
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
