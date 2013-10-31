# backbone-nestify

Backbone Nestify is a [Backbone.js](http://backbonejs.org) plugin for nesting Backbone Models and Collections.

It provides two features:

1. Specify the mapping between [Model](http://backbonejs.org/#Model) attributes names and the nested Model (or [Collection](http://backbonejs.org/#Collection)) constructors, in order to dynamically deserialize nested JSON into the proper tree of nested Model/Collection instances.

1. Syntactic sugar is provided to easily get and set these nested Models and Collections.

## Usage

Backbone Nestify depends only on Backbone and [Underscore](http://underscorejs.org/). It is a model mixin; any model definition can have its functionality added like so:

```javascript

var FooModel = Backbone.Model.extend(
    _.extend({
        /* Model definition... */
    }, nestify({
        "bar":{constructor:BarModel},
        "baz":{constructor:BazCollection}
    }))
);
```
## Development

    $ npm install
    $ grunt [dist]
