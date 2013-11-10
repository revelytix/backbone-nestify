# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting Backbone Models and Collections.

It provides two features:

1. Specify the mapping between [Model](http://backbonejs.org/#Model) attributes names and the nested Model (or [Collection](http://backbonejs.org/#Collection)) constructors, in order to dynamically deserialize nested JSON into the proper tree of nested Model/Collection instances.

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

1. Syntactic sugar is provided to easily get and set these nested Models and Collections.

```javascript
var item3 = cart.get(["account", "orders", 0, "items", 3]); // an Item Model instance

cart.set("account|orders|0|items|3|id", 50]); // Third Item now has an id of 50
```

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

## Useful If

If you are constrained to an API which uses deeply nested trees of entities, which can perhaps be composed and reused in different combinations, then this plugin may help you to work with a corresponding set of custom Backbone Models and Collections. The plugin was designed especially to make serialization too and from JSON work seamlessly, as well as providing the convenience syntax for working with nested Model or Collection attributes.

## Under the Hood

Broadly speaking, the plugin works by replacing the [get](http://backbonejs.org/#Model-get) and [set](http://backbonejs.org/#Model-set) methods of the Model (or Collection) definitions. The replacement methods delegate to the original methods to provide the usual Backbone functionality, and they add the additional functionality provided by this plugin.

## Development

    $ npm install
    $ grunt [dist]
