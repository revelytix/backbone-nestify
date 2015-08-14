# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting
Backbone [Models](http://backbonejs.org/#Model) and
[Collections](http://backbonejs.org/#Collection). It depends only on Backbone
and [Underscore](http://underscorejs.org/).

## Download
* [0.6.0 release](dist/backbone-nestify-0.6.0.min.js?raw=true) - minified, 8kb
* [0.6.0 release](dist/backbone-nestify-0.6.0.js?raw=true) - 34 kb

## Features

Backbone Nestify provides two features:

* A syntax to more easily nest, and access, attributes within nested Models and
  Collections.

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

With these Model and Collection definitions in place, a Model instance for this
JSON can be constructed in the usual Backbone manner:

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

Nestify customizes the Backbone Model the
[get](http://backbonejs.org/#Model-get) and
[set](http://backbonejs.org/#Model-set) methods to provide a convenient syntax
to access the nested attributes of a nestified Model.

### Getting

Nested attributes can be accessed using an array syntax, where each item in the
array corresponds with a level of nesting:

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

Both of the above are shorthand for the manual way of accessing nested
attributes using ordinary Backbone syntax:

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

Backbone Model's [unset](http://backbonejs.org/#Model-unset) and
[clear](http://backbonejs.org/#Model-clear) methods are both supported. The
unset function supports nestify's extended syntax:

```javascript
shoppingCart.unset("orders|0|items|2|backOrdered");
```

### hasChanged

Backbone Model's [hasChanged](http://backbonejs.org/#Model-hasChanged) method
can optionally be made to do a recursive check for nested changed Models via the
`{nested:true}` option.

```javascript
shoppingCart.hasChanged({nested: true});
```

The `attr` param is still supported; in that case the options hash can be bumped
to the second parameter:

```javascript
shoppingCart.hasChanged("orders", {nested: true});
```

## Nestify Spec

The plugin provides an API which accepts a nesting **spec**. The resulting
**mixin** can then be set on individual Model instances or Model class
constructors.

Broadly speaking, the spec is a mapping from Model attribute names to the nested
Model or Collection class for those attributes. A Model (or Collection)
definition (or instance) is nestified once, up front. Thereafter, any
modifications to instances of that Model will adhere to the nesting
specification. This is particularly good for dynamically deserializing complex
JSON into the proper tree of nested Model/Collection instances.

In this illustration, a ShoppingCart Model is nestified. Two of its attributes
are paired with the desired nested Model types (Order and Account,
respectively).
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

A more typical scenario is to combine the mixin with other custom properties
when defining a Model definition. (Note the use of Underscore's
[extend](http://underscorejs.org/#extend) function.)

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

The mixin, once produced, can be added to a Backbone Model or Collection
definition or instance using any of the ordinary means provided by Backbone. It
can be included in the Model definition like so:

```javascript
var ShoppingCart = Backbone.Model.extend(_.extend({
    // ...model definition...
}, mixin));
```

Which would be equivalent to modifying the prototype of an existing Model (or
Collection) constructor function:

```javascript
_.extend(ShoppingCart.prototype, mixin);
```

It can be mixed in directly to a Model or Collection instance, if need be.

```javascript
var shoppingCart = new Backbone.Model();

_.extend(shoppingCart, mixin);
```

### Deep Nesting

Nestifying is not confined to the top-level Model only. The nested Model and
Collection types can themselves be nestified (as can be seen in the
[Example](#example)).

### Empty Spec

A spec can be empty; the resulting mixin will still provide the benefits of the
[getter/setter syntax](#nestify-getter-setter-syntax).

```javascript
var MyModel = Backbone.Model.extend(nestify());
```

This might be sufficient if the [containers](#containers) to be nested within
the nestified model(s) are already of the desired type. In that case, no
specification is necessary. The spec's primary benefit is when new instances of
specific Models or Collections need to be constructed when raw JavaScript is
being set on the nestified model, such as when the JSON from a restful API
endpoint is the input, for example.

## Options

Nestify options, like Backbone options, are a simple hash of name/value pairs.
They can be specified by either of the following means:

* When calling nestify(), pass an options hash as a second (optional) parameter.
  These options are in effect for the lifetime of the mixin.

```javascript
var mixin = nestify(spec, {delim:"."});
```

* Piggybacking on Backbone options when calling get() or set(). These options
  are only in effect for the duration of the method call; they will override any
  options specified to the nestify() function.

```javascript
shoppingCart.get("pending.items.0.itemID", {delim:"."});
```

### delim

The `delim` option can be used to specify the delimeter to use in the
stringified syntax. By default this delimiter is the pipe character `|`.

```javascript
shoppingCart.get("pending|items|0|itemID");
// or
shoppingCart.get("pending.items.0.itemID", {delim:"."});
```

### update

The `update` option gives fine-grained control over the updating of Nestify
[containers](#containers). The possible values are `reset`, `merge`, and
`smart`.

* `reset` - the contents of a container is completely replaced
* `merge` - new values are merged into a container's current values
* `smart` - new values are "smart"-merged into a container's current values. 

Each option has slightly different implications for each different
[type of container](#containers).

_Note:_ Currently, the contents of Objects and Arrays are _not_ recursively
updated. That is, containers nested within them are not intelligently updated,
but rather are left alone or replaced altogether.

This option is best illustrated with examples; let's start with an existing order.
```javascript
var order = new Order({items:[{id:1,desc:"bread"}, 
                              {id:2,desc:"cheese"}]});
```
Each following section contains an example which updates this order.

#### reset

Containers' contents are replaced completely:

* `Collection` - updated using [reset](http://backbonejs.org/#Collection-reset),
  which completely replaces its contents.
* `Model` - [cleared](http://backbonejs.org/#Model-clear), then updated using
  [set](http://backbonejs.org/#Model-set)
* `Array` - _default behavior_ - any existing Array is replaced by the new Array
* `Object` - _default behavior_ - any existing Object is replaced by the new
  Object

Example: resetting the Items Collection...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {update:"reset"});
```
...results in the order now having a single 'butter' Item.

#### merge

The most precise behavior: container attributes are updated by index for
Array-like containers, and by attribute-name for Object-like containers.

* `Collection` - _default behavior_ - values are overwritten individually, in
  place, by index (see [at](http://backbonejs.org/#Collection-at) method)
* `Model` - _default behavior_ - updated using
  [set](http://backbonejs.org/#Model-set)
* `Array` - updated by numerical index. _Note:_ Currently, the contents of
  Arrays are _not_ recursively merged. That is, containers nested within the
  Array are not intelligently updated, but rather are left alone or replaced
  altogether.
* `Object` - updated by String attribute name._Note:_ Currently, the contents of
  Objects are _not_ recursively merged. That is, containers nested within the
  Object are not intelligently updated, but rather are left alone or replaced
  altogether.

Example: updating the Items Collection...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {update:"merge"});
```
...will replace the first Item in the Collection (bread) with a new first Item
(butter). The second item could be replaced instead (note the `null` in the
array):
```javascript
order.set({items:[null,{id:3,desc:"butter"}]}, {update:"merge"});
```
...which would be equivalent to using the nestify syntax:
```javascript
order.set("items|1|", {id:3,desc:"butter"});
```

#### smart

Indicates a "smart" merge. For Collections,
[a "smart" update is performed](http://backbonejs.org/#Collection-set). For all
other containers this option is the same as using
[update:merge](#options/update/merge). See the section on
[containers](#containers) for a full explanation.

Behavior, by container type:

* `Collection` - updated using its [set](http://backbonejs.org/#Collection-set)
  method, which performs a Backbone "smart" update. (See
  [documentation](http://backbonejs.org/#Collection-set) for additional Backbone
  options that can be paired with this one.)
* `Model` - same as [merge](#options/update/merge)
* `Array` - same as [merge](#options/update/merge)
* `Object` - same as [merge](#options/update/merge)

Example: setting the Items and taking advantage of Backbone's `{remove:false}`
option...
```javascript
order.set({items:[{id:3,desc:"butter"}]}, {update:"smart", remove:false});
```
...will do a Collection smart merge, resulting in the order now having all three
Items.

## Containers

Conceptually speaking, a **container** is anything that can hold a nested value.
It is a Model attribute which Nestify can use to nest attributes. A container
can be any of:

* a `Backbone Model`
* a `Backbone Collection`
* a plain `Array`
* a plain `Object`

All containers can be indexed using the
[getter/setter syntax](#nestify-getter-setter-syntax). Notice that two of these
container types are `Array`-like: `Collections` and `Arrays`. They both are
indexed by integer numbers. Similarly, the other two container types are
`Object`-like: `Models` and `Objects`. They both are indexed by String attribute
names.

Controlling the updating of a Model's nested containers is fundamental to
Nestify. Nestify provides the [update](#options/update) option to control the
updating of container instances. Nestify also allows this update policy to be
set on a container-by-container basis using
[advanced container specification](#advanced-spec/container). Finally, Nestify
assumes reasonable defaults for each type of container:

* `Collection` - default update behavior is [merge](#options/update/merge)
* `Model` - default update behavior is [merge](#options/update/merge)
* `Array` - default update behavior is [reset](#options/update/reset) (same as
  unmodified Backbone)
* `Object` - default update behavior is [reset](#options/update/reset) (same as
  unmodified Backbone)

### Array or Object

Backbone itself already allows simple nesting via native JavaScript Arrays and
Objects; Nestify simply provides its
[getter/setter](#nestify-getter-setter-syntax) syntactic sugar on top of this.
In fact, using an empty spec such as this:

```javascript
var Model = Backbone.Model.extend(nestify());
```

...will still nestify the Model and allow the use of Nestify's getter/setter
syntax. It simply will not change the storage of those nested attributes; they
will continue to be stored in plain Objects or Arrays.

```javascript
var m = new Model({
    orders: [{id: 1}]
});

m.get("orders|0|id"); //returns 1
m.get("orders|0");    //returns an Object
m.get("orders");      //returns an Array
```

### Model or Collection

Specifying that a container should be a Backbone Model or Collection is the
expected majority use case.

```javascript
var spec = {account: AccountModel,
            orders: OrdersCollection}}
```

## Advanced Spec

In the examples so far, the **spec** has always been a simple **hash** of Model
attributes to nested Model or Collection **container** types. This _abbreviated_
form is expected to be the typical, 80% use case.

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

<container>   ::= <constructor>
                | {constructor: <constructor>,
                   args       : <arguments to constructor>,       // optional 
                   opts       : <options to Backbone>             // optional 
                   spec       : <speclist>                        // optional

<constructor> ::= <Backbone Model constructor function> 
                | <Backbone Collection constructor function>
                | <Array constructor function>
                | <Object constructor function>
                | <arbitrary function>
```

### Hash

By passing an **array** to Nestify, you are opting-in to the advanced spec form;
you cannot use the abbreviated hash form. But, you can still explicitly supply a
hash thusly:

```javascript
// advanced form, explicit 'hash'
var spec = [{hash: {account: AccountModel,
                    orders: OrdersCollection}}];

// equivalent to abbreviated form:
var spec = {account: AccountModel,
            orders: OrdersCollection}};
```

A hash can be thought of as the degenerate form of the more general, more
powerful pairing of **matchers** and a **containers**.

### Matcher

An alternative to the hash is a **matcher**/**container** pair. A matcher can be
used to match on any of the containing Model's attributes; The container
specifies what sort of object should be stored for that attribute, to contain
nested attributes.

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

For maximum matching capability, a JavaScript predicate Function can be used.

```javascript
var len=3;

//...
{match: function(attr, val, existing, opts){
    return attr.length === len;
 },
 container: OrderModel}
```

The supplied predicate will be passed these parameters: 

* The String `attribute` name
* The incoming, unmodified container `value` to be set
* The `existing` container, if any
* The `opts` hash

It should return true or false.

#### Omitted

The matcher can be omitted entirely; this means "match all attributes".

```javascript
// will match everything
{container: EverythingModel}
```

### Container

The [basics of containers](#containers) have already been covered. The general
spec form introduces a new concept, a **constructor**, which provides more
flexibility in generating new container values.

### Constructor

A **constructor** is a JavaScript function which produces a new container value.
A constructor function can be any container constructor function or a custom
(non-constructor) function.

Constructors come into play whenever a [set](http://backbonejs.org/#Model-set)
is being performed. Nestify will always use any _existing_ nested containers
that it encounters as it sets value(s) into the top-level nestified Model. The
constructor can be thought of as specifying how to automatically create _new_
container values where non exist but are needed to complete the set operation.

So far, examples have only shown an _implied_ constructor value by pairing the
`container` attribute with a Backbone Model or Collection constructor:

```javascript
{orders: OrdersCollection}
```

This is equivalent to the general form, which makes explicit the constructor:

```javascript
{match: 'orders', 
 container: 
 {constructor: OrdersCollection}
}
```

_Note:_ The Nestify `set` algorithm will first instantiate the container via the
constructor, and then set value(s) on them. So the purpose of the constructor
should be thought of as producing an _empty_ new container, ready to receive
values (as specified in the [update](#options/update) option).

#### Model or Collection

Specifying that a container should be a Backbone Model or Collection is the
expected majority use case; just use their constructor functions, like so:

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

Specifying arguments to the Backbone constructor, and/or specifying a Nestify
spec for instances of that Backbone container, can be accomplished using the
`constructor` attribute:

```javascript
var spec = [{match: "account",
             container: {constructor: AccountModel,
                         args: {preferred: true},
                         spec: {rewards: RewardCollection}
                        }];
```

Backbone Model or Collection constructor functions are passed up to two
arguments at construction time: the `spec.args` (if supplied), and the
`spec.opts` (if supplied).

#### Array or Object

A [container](#containers) can be a simple Array or Object. In fact this happens
automatically (mimicking Backbone's default behavior) if no container is
specified for an attribute.

You may wish to explicitly specify an Array or Object container if you want to
take advantage of the options available in the general spec form. For example,
you may want to specify an Array container that is _always_ updated with the
`merge` option (rather than its default `reset` option, see
[update:reset](#options/update/reset)):

```javascript
// 'notes' is, say, a simple Array of Strings
var spec = [{match: "notes",
             container: {constructor: Array,
                         opts: {update: "merge"}
                        }];
```

Array or Object constructor functions are passed no arguments at construction
time.

#### Function

For utmost flexibility, a constructor can be a custom function.

The supplied function will be passed five parameters: 

* The incoming, unmodified container `value` to be set (for example, raw JSON)
* The `opts` hash
* The String `attribute` name
* The containing Backbone `Model`

The function should return the resulting container object.

```javascript
var spec = [{match: "account",
             container: function(v, opts, att, m){
                 return new AmazingModel(v, opts);
             }
            }];
            
// or...

var spec = [{match: "account",
             container: {
                 constructor: function(v, opts, att, m){
                     return new AmazingModel(v, opts);
                 }
             }
            }];
```

The function will be passed the following parameters: the `value`, `opts`, the
String `attribute`, the top-level nestified `model`. It should return a valid
(and presumably empty) Nestify [container](#containers), which will then have
value(s) set on it according to the [update option](#options/update).

The function will _not_ be invoked using the `new` keyword.

### Example

An example of the Advanced Spec Form:

```javascript
nestify([{
    hash: {foo: FooModel,
           bar: BarModel}
},{
    match: /abc/,
    container: BarModel
},{
    match: function(...){return true;},
    container: {
        constructor: function(...){return something;}
    }
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

The plugin works by replacing the [get](http://backbonejs.org/#Model-get),
[set](http://backbonejs.org/#Model-set) and
[hasChanged](http://backbonejs.org/#Model-hasChanged) methods of the Model (or
Collection) definitions. The replacement methods delegate to the original
methods to provide the usual Backbone functionality, and they add the additional
functionality provided by this plugin. The mixin is just an ordinary object
containing these two methods.

```javascript
var mixin = nestify({
   ...
});

_.keys(mixin); // ["get","set","hasChanged"]
```

## Why?

I'll be honest here: like countless software developers before us, we identified
a problem and, not knowing much about it yet, assumed it would be easy to fix by
ourselves. Nesting attributes within Backbone Models is apparently a popular
enough need that it merits its own [FAQ](http://backbonejs.org/#FAQ-nested). We
evaluated some of the existing plugins but decided for various reasons to try
our own approach, which eventually became this plugin.

Having said all of that, we believe Nestify fills a couple of really sweet
spots:

* It is [mixin-based](#nestify-spec/applying-the-mixin) rather than Class based.
  That is, your Models do not have to extend a particular Model superclass in
  order to use the plugin. Instead, the plugin produces a mixin object which can
  be added to any existing Model or Collection definition, or even just a single
  instance of a type of Model or Collection.
* a [simple but flexible getter/setter syntax](#nestify-getter-setter-syntax).
* Nestify was designed especially to make serialization to and from JSON work
  seamlessly. In our case, we have a RESTful API returning potentially
  complicated and deeply-nested responses, and we want our Model instances to
  ["just work"](#example) once they are configured.

## Development

    $ npm install
    $ grunt [dist]

You may first need|want to

* add Ubuntu Node PPA https://launchpad.net/~chris-lea/+archive/ubuntu/node.js

        sudo apt-add-repository ppa:chris-lea/node.js

* install node

        sudo apt-get install nodejs

* install grunt CLI

        sudo npm install -g grunt-cli


## Changelog

### 0.6.0

#### Aug 14, 2015

* Tests pass against
  * backbone 1.2.1 and underscore 1.8.3
  * backbone 1.1.2 and underscore 1.6.0
  * backbone 1.0.0 and underscore 1.5.2
* The signature of `nestify.instance()` has changed from
  `nestify.instance(model, spec [, opts])` to
  `nestify.instance(mode, mixin [, opts])`. In other words, the second parameter
  should be the mixin itself, rather than the spec which produces a mixin. This
  could be as simple as doing: `nestify.instance(model, nestify(spec))`.
* All params to `nestify.instance()` except for the first are now optional.
  Invoking `nestify.instance(model)` is equivalent to invoking with an empty
  spec mixin i.e. `nestify.instance(model, nestify())`
* Bug fix (issue #5) - Fixed Collection `merge` update for nested Collections.
* Bug fix (issue #10) - Coerce `null` or `undefined` attributes to empty array
  when updating nested Collections.
* Update copyright year to 2015.
* Update copyright holder from Revelytix to Teradata (who acquired Revelytix in
  2014).

### 0.5.0

#### Aug 25, 2014

* Enhancement (issue #8) - Model `hasChanged` method now optionally
  does a recursive check for nested changed Models. Use {nested:true}
  param.

### 0.4.0 

#### Apr 11, 2014

* Grunt mocha task now tests against multiple versions of Backbone
  (currently: 1.0.0, 1.1.2).
* Bug fix - correct the instantiation of a non-Backbone container (i.e. simple
  Object or Array).
* Bug fix (issue #2) - nestify.auto() should not create spurious properties on
  nested Models.
* Bug fix (issue #3) - nestify.auto() should not assume arrays always contain
  nested objects.
* Bug fix (issue #4) - only parse simple integer values as indices out of
  stringified getter/setter strings.
* Create release checklist
* Create Changelog (issue #1).
* Update copyright year to 2014.

### 0.3.0 

#### Jan 28, 2014

* `coll` option is now `update` option. Possible values (which were `reset`,
  `set` and `at`) are now `reset`, `merge` and `smart`.
* Documented limitations of nesting primitive Object or Array containers.
  Collections or Models are recommended.
* Further internal refactoring - more compiler optimizing; updaters.
* Bug fix for updating of nested containers which are unspecified.
* Nestify a populated model instance in-place (alpha; subject to change).

### 0.2.0 

#### Dec 19, 2013

* Top-level `nestify` module function accepts `opts` param; can be overriden
  with `opts` to `get` or `set`.
* Introduce configurable delimiter option.
* Formalize spec general and abbreviated forms.
* Bug fix: nested Collection length attribute.
* Internal refactoring, cleanup - compiler, matchers, containers.
* Switch mocha test runner, tests from 'bdd' to 'qunit'.
* Auto-nestification into plain Models or Collections without specification
  (alpha; subject to change).

### 0.1.0 

#### Oct 30, 2013

* Initial release of Revelytix internal version.
