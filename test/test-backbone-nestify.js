(function (factory){
    // node
    if (typeof module === 'object') {
        module.exports = factory(
            require('underscore'), 
            require('backbone'), 
            require('chai'), 
            require('mocha'),
            require('../backbone-nestify'));
    // require.js
    } else if (typeof define === 'function' && define.amd) {
        define([
            "underscore", 
            "backbone",
            "chai",
            "mocha",
            "backbone-nestify"
        ], factory);
    } else {
        // globals 
        factory(this._, this.Backbone, this.chai, this.mocha, this.nestify);
    }
}(function(_, Backbone, chai, mocha, nestify) {

    var assert = chai.assert,
        expect = chai.expect,
        unDfynd;

    describe('Nestify', function(){

        var env;

        beforeEach(function(){

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

            env = {
                Item: Item,
                Items: Items,
                Order: Order,
                Orders: Orders,
                Account: Account,
                ShoppingCart: ShoppingCart
            };
        });

        describe('simple set', function(){
            it("should work as normal", function(){
                var a = new env.Account();
                a.set("id", 3);
                expect(a.get("id")).to.equal(3);
            });
        });

        describe('single Model', function(){
            it("should have undefined attributes, initially", function(){
                var a = new env.Account();
                expect(a.get("phone")).to.be.undefined;
                expect(a.get("email")).to.be.undefined;
            });
        });

        describe('nested Model set', function(){
            it("should allow retrieval of nested value(s) using either syntax style", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                acct.set("email", "nuge@hotmail.com");
                expect(cart.get(["account", "email"])).to.equal("nuge@hotmail.com");
                expect(cart.get("account|email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using array syntax", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set(["account","email"], "nuge@hotmail.com");
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using stringified syntax", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set("account|email", "nuge@hotmail.com");
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using JSON", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set({account: {email:"nuge@hotmail.com"}});
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
        });

        /**
         * Test model can be constructed w/ raw JSON, and
         * nested model is of the correct expected type
         */
        describe('nested model dynamic construction', function(){
            it("should be spec'd, then constructed with raw JSON", function(){
                var cart = new env.ShoppingCart({account: {email:"nuge@hotmail.com"}});
                expect(cart.get("account|email")).to.equal("nuge@hotmail.com");
                expect(cart.get("account")).to.be.an.instanceof(env.Account);
            });
        });

        /**
         * Similar test, for arrays/Collections
         */
        describe('nested collection dynamic construction', function(){
            it("should be spec'd, then constructed with raw JSON", function(){
                var acct = new env.Account({orders: [{id:51}, {id:52}]});
                expect(acct.get("orders|0|id")).to.equal(51);
                expect(acct.get("orders|1|id")).to.equal(52);
                expect(acct.get("orders")).to.be.an.instanceof(env.Orders);
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
            });
        });

        describe('nested collection', function(){
            it("should support the get syntax options", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                var order2 = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                orders.add(order2);
                order.set("spicy", "meatball");
                order2.set("tangy", "tofu");
                expect(acct.get(["orders", 0, "spicy"])).to.equal("meatball");
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get(["orders", 1, "tangy"])).to.equal("tofu");
            });

            it("should support the set syntax options", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                var order2 = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                orders.add(order2);
                acct.set(["orders", 0, "spicy"], "meatball");
                expect(order.get("spicy")).to.equal("meatball");
                acct.set(["orders", 1, "greasy"], "granny");
                expect(order2.get("greasy")).to.equal("granny");
            });

            it("should support stringified set", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                acct.set("orders|0|spicy", "meatball");
                expect(order.get("spicy")).to.equal("meatball");
            });

            it("should support 'length' attribute", function(){
                var acct = new env.Account({orders: new env.Orders()});
                expect(acct.get("orders").length).to.equal(0);
                acct.set("orders|0|spicy", "meatball");
                expect(acct.get("orders").length).to.equal(1);
            });
        });

        describe('configurable delimiter', function(){
            it("can be changed at specification time", function(){
                var ShoppingCart = Backbone.Model.extend(nestify({
                    pending: {constructor: env.Order},
                    account: {constructor: env.Account}
                },{
                    delim:"." //period
                }));

                var cart = new ShoppingCart({
                    account: {email: "nuge@hotmail.com"}
                });
                expect(cart.get("account.email")).to.equal("nuge@hotmail.com");
                cart.set("account.email", "nuge@geocities.com");
                expect(cart.get("account.email")).to.equal("nuge@geocities.com");
            });
            it("can be changed at get/set time", function(){
                var cart = new env.ShoppingCart({
                    account: {email: "nuge@hotmail.com"}
                });
                expect(cart.get("account.email", {delim:"."})).to.equal("nuge@hotmail.com");
                cart.set("account,email", "nuge@geocities.com", {delim:","});
                expect(cart.get("account|email")).to.equal("nuge@geocities.com");
                cart.set("account,email", "nuge@geocities.com", {delim:","});
                expect(cart.get("account|email")).to.equal("nuge@geocities.com");
                cart.set({"account?email": "nuge@geocities.com"}, {delim:"?"});
                expect(cart.get("account email", {delim:" "})).to.equal("nuge@geocities.com");
            });
        });

        /**
         * Note that setting things up front overrides any
         * constructors that may be declared for a nested property.
         */
        describe('deeply-nesting models', function(){
            it("should allow up-front assemblage of nested models, overriding spec", function(){
                var acct = new env.Account();
                var acct2 = new env.Account();
                var orders = new env.Orders();
                var orders2 = new env.Orders();
                var orders3 = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(acct2);  // contrived; just to demonstrate
                acct2.set("orders2", orders2);
                acct2.set("orders", orders3);
                orders2.add(order);
                orders3.add(new env.Order({greasy:"granny"}));
                order.set("monkey", "butter");
                expect(acct.get("orders|0|orders2|0|monkey")).to.equal("butter");
                expect(acct.get("orders|0|orders|0|greasy")).to.equal("granny");
            });

            /**
             * If the value being passed in is already a
             * Backbone.Model or Collection instance, preserve 
             * that instance
             */
            it("set should preserve the instance", function(){
                var cart = new env.ShoppingCart();
                var orders = new env.Orders();
                cart.set("account", orders); // contrived, just to demonstrate
                expect(cart.get("account")).to.be.an.instanceof(env.Orders);
            });
        });

        /**
         * Test that standard Backbone options are supported. 
         */
        describe('set with options', function(){

            it("silent should suppress events", function(){
                var eventHeard = false;
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                acct.on("change:loud", function(){eventHeard = true;});
                acct.on("change:quiet", assert.fail);
                cart.set({account: {loud: 4}});
                cart.set({account: {quiet: 8}}, {silent:true});
                expect(eventHeard).to.be.true;
            });

            /**
             * similar to previous; counts the number of events on
             * the top-level model 
             */
            it("should count events without silent", function(){
                var eventCount = 0;
                var cart = new env.ShoppingCart();
                cart.on("change", function(){eventCount = eventCount + 1;});
                cart.set("account", new env.Account());
                cart.set({account: {loud: 4}});
                expect(eventCount).to.equal(1);
            });

            it("should set nested JSON silently", function(){
                var cart = new env.ShoppingCart();
                cart.on("change", assert.fail);
                cart.set({account: {id: 8}}, {silent:true});
            });

            it("should set JSON on nested model silently", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                acct.set("id", 8);
                cart.on("change", assert.fail);
                cart.set({account: acct}, {silent:true});
            });

            it("should should set JSON on nested collection silently", function(){
                var acct = new env.Account();
                acct.on("change", assert.fail);
                acct.set({orders: [{id: {quiet: 8}}]}, {silent:true});
            });

            it("should set nested collection silently", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                orders.add(new env.Order({quiet:8}));
                acct.on("change", assert.fail);
                acct.set({orders: orders}, {silent:true});
            });
        });

        describe('nesting an existing model into a model', function(){

            it("should work if pre-constructed", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account();
                acct.set("orders", orders);
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if pre-constructed using JSON", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account();
                acct.set({orders: orders});
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if modifed after nesting", function(){
                var orders = new env.Orders();
                var acct = new env.Account();
                acct.set("orders", orders);
                orders.add(new env.Order({name:"Tim"}));
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if modified with JSON after nesting", function(){
                var orders = new env.Orders();
                var acct = new env.Account();
                acct.set({orders: orders});
                orders.add(new env.Order({name:"Tim"}));
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should allow construction with JSON", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account({orders: orders});
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });
        });

        describe('constructing a model with a nested collection', function(){

            it("should allow JSON set", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                acct.set({orders:[{spicy:"meatball"}]});
                expect(order.get("spicy")).to.equal("meatball");
            });

            it("should allow JSON set, followed by collection modification", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                acct.set("orders", orders);
                orders.add(new env.Order());
                acct.set({orders:[{spicy:"meatball"}]});
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
            });

            it("should allow modifying the nested collection's model", function(){
                // setup
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                orders.add(new env.Order({name:"Tom"}));
                var acct = new env.Account();
                acct.set("orders", orders);
                expect(acct.get("orders|0|name")).to.equal("Tim");
                expect(acct.get("orders|1|name")).to.equal("Tom");

                // test
                acct.set({orders:[{spicy:"meatball"}]});

                // expectations
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get("orders|0|name")).to.equal("Tim");
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
                expect(acct.get("orders|1|name")).to.equal("Tom");
            });

            it("should allow setting of nested collection's models' attributes", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order0 = new env.Order();
                var order1 = new env.Order();
                acct.set("orders", orders);
                orders.add(order0);
                orders.add(order1);
                acct.set("orders|0|spicy", "meatball");
                expect(order0.get("spicy")).to.equal("meatball");
                expect(order1.get("spicy")).to.be.undefined;
                acct.set("orders|1|spicy", "canoli");
                expect(order0.get("spicy")).to.equal("meatball");
                expect(order1.get("spicy")).to.equal("canoli");
            });

            // issue #10
            it("should allow null collection", function(){
                var acct = new env.Account();
                acct.set({orders: null});
                expect(acct.get("orders").length).to.equal(0);
            });


        });

        describe('fine-grained control of nested collection modification by using custom options', function(){

            describe('setting with the "reset" option', function(){
                /**
                 * Simulates the case of a sync: we expect the nested
                 * set to completely replace the contents of any 
                 * nested collections. Hence the {reset:true} option.
                 */
                it("should completely replace the contents of the nested collection", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {update:"reset"});
                    expect(acct.get("orders").models.length).to.equal(1);
                    expect(acct.get("orders").length).to.equal(1);
                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        update:"reset"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]});
                    expect(acct.get("orders").models.length).to.equal(1);
                    expect(acct.get("orders").length).to.equal(1);
                });
            });

            describe('setting with the "smart" option', function(){

                /**
                 * Update nested collection with built-in 'set'
                 * function, relying on 'smart' merge, with remove set
                 * to false. Therefore we expect to add the new model
                 * without removing any others.
                 */
                it("should add new models w/o removing others", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {update:"smart", remove:false});
                    expect(acct.get("orders").models.length).to.equal(3);
                    expect(acct.get("orders").length).to.equal(3);
                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        update:"smart"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {remove:false});
                    expect(acct.get("orders").models.length).to.equal(3);
                    expect(acct.get("orders").length).to.equal(3);
                });
            });

            /**
             * The default and most precise behavior: nested
             * collections are updated with 'merge' function based on
             * index.
             */
            describe('setting with the default "at" option', function(){
                it("should update based on index", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {update:"merge"});
                    expect(acct.get("orders").models.length).to.equal(2);
                    expect(acct.get("orders").length).to.equal(2);
                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        update:"merge"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]});
                    expect(acct.get("orders").models.length).to.equal(2);
                    expect(acct.get("orders").length).to.equal(2);
                });
            });
        });

        describe('uninitialized nested container', function(){

            /**
             * Tests that a nested Model may be unitialized, as
             * long as its constructor is spec'd
             */
            it("should dynamically construct instance of the spec'd model", function(){
                var acct = new env.Account();
                acct.set("orders|2|spicy", "meatball");
                var b = acct.get("orders|2");
                expect(b).to.be.an.instanceof(env.Order);
                expect(b.constructor).to.equal(env.Order);
                expect(b.get("spicy")).to.equal("meatball");
            });
        });

        /**
         * A 'container' is any of:
         * (*) Backbone Model
         * (*) Backbone Collection
         * (*) plain Array
         * (*) plain Object
         * 
         * Their updating can be controlled via options.
         */
        describe('containers', function(){

            /*
             * Nested container attributes that are not spec'd as having a Model
             * or Collection constructor can still be gotten and set
             * using the custom nested getter/setter syntax. In that
             * case, Nestify will use plain Java Arrays and/or Objects
             * as nested containers.
             */
            describe("nesting primitive, non-spec'd containers", function(){

                it('should nest primitives', function(){
                    var order = new env.Order();
                    order.set("something|spicy", "meatball");
                    expect(order.get("something|spicy")).to.equal("meatball");
                });

                it('should nest primitive into an array', function(){
                    var order = new env.Order();
                    order.set("something|2|spicy", "meatball");
                    expect(order.get("something|2|spicy")).to.equal("meatball");
                });

                it('should make array rather than Collection, obj rather than Model', function(){
                    var order = new env.Order();
                    order.set("something|2|spicy", "meatball");
                    expect(order.get("something")).to.not.be.an.instanceof(Backbone.Collection);
                    expect(order.get("something")).to.be.an.instanceof(Array);
                    expect(order.get("something|2")).to.not.be.an.instanceof(Backbone.Model);
                    expect(order.get("something|2")).to.not.be.an.instanceof(Array);
                    expect(order.get("something|2")).to.be.an.instanceof(Object);
                    expect(order.get("something|2|spicy")).to.equal("meatball");
                    expect(order.get("something")).to.deep.equal([, , {spicy:"meatball"}]);
                });

                it('should fill array sparsely if necessary', function(){
                    var order = new env.Order();
                    order.set(["something", 0], "snuh", {update:"merge"});
                    order.set(["something", 2], "blammo", {update:"merge"});
                    var b = order.get("something");
                    expect(b).to.be.an.instanceof(Array);
                    expect(b[0]).to.equal("snuh");
                    expect(b[1]).to.be.undefined;
                    expect(b[2]).to.equal("blammo");
                });

                it('should set objects nested', function(){
                    var order = new env.Order();
                    order.set(["something", "aak"], "snuh");
                    order.set(["something", "oop"], "blammo");
                    var b = order.get("something");
                    expect(b).to.be.an.instanceof(Object);
                    expect(b.aak).to.be.undefined;
                    expect(b.oop).to.equal("blammo");
                });

                it('should set objects nested (merge update)', function(){
                    var order = new env.Order();
                    order.set(["something", "aak"], "snuh");
                    order.set(["something", "oop"], "blammo", {update:"merge"});
                    var b = order.get("something");
                    expect(b).to.be.an.instanceof(Object);
                    expect(b.aak).to.equal("snuh");
                    expect(b.oop).to.equal("blammo");
                });

                it('should replace objects (no mixin)', function(){
                    var order = new Backbone.Model();
                    order.set({item: {id: 1,
                                      desc:"laptop",
                                      count: 1}});
                    order.set({item: {id: 1,
                                      size:"large",
                                      count:2}});
                    expect(order.get("item")).to.deep.equal({
                        id: 1,
                        size:"large",
                        count:2
                    });
                });

                it('should replace objects (mixin default)', function(){
                    var order = _.extend(new Backbone.Model(), nestify());
                    order.set({item: {id: 1,
                                      desc:"laptop",
                                      count: 1}});
                    order.set({item: {id: 1,
                                      size:"large",
                                      count:2}});
                    expect(order.get("item")).to.deep.equal({
                        id: 1,
                        size:"large",
                        count:2
                    });
                });

                it('should replace objects (mixin default)', function(){
                    var order = _.extend(new Backbone.Model(), nestify());
                    order.set({item: {id: 1,
                                      desc:"laptop",
                                      count: 1}});
                    order.set("item|id", 1);
                    order.set("item|size", "large");
                    order.set("item|count", 2);
                    
                    expect(order.get("item")).to.deep.equal({
                        count:2
                    });
                });

                it('can overlay objects', function(){
                    var order = _.extend(new Backbone.Model(), nestify());
                    order.set({item: {id: 1,
                                      desc:"laptop",
                                      count: 1}}, {update:"merge"});
                    order.set({item: {id: 1,
                                      size:"large",
                                      count:2}}, {update:"merge"});
                    expect(order.get("item")).to.deep.equal({
                        id: 1,
                        desc:"laptop",
                        size:"large",
                        count:2
                    });
                });

                it('can overlay objects', function(){
                    var order = _.extend(new Backbone.Model(), nestify({}, {update:"merge"}));
                    order.set({item: {id: 1,
                                      desc:"laptop",
                                      count: 1}});
                    order.set("item|id", 1);
                    order.set("item|size", "large");
                    order.set("item|count", 2);
                    
                    expect(order.get("item")).to.deep.equal({
                        id: 1,
                        desc:"laptop",
                        size:"large",
                        count:2
                    });
                });

                it('should replace arrays (no mixin)', function(){
                    var order = new Backbone.Model();
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        size: "med",
                        count: 1
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }]});
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        count: 2
                    },null,{
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]});
                    expect(order.get("items")).to.deep.equal([{
                        id: 1,
                        desc:"laptop",
                        count: 2
                    }, null, {
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]);
                });

                it('should replace arrays (default mixin)', function(){
                    var order = _.extend(new Backbone.Model(), nestify());
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        size: "med",
                        count: 1
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }]});
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        count: 2
                    },null,{
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]});
                    expect(order.get("items")).to.deep.equal([{
                        id: 1,
                        desc:"laptop",
                        count: 2
                    }, null, {
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]);
                });

                it('should overlay arrays', function(){
                    var order = _.extend(new Backbone.Model(), nestify({}, {update:"merge"}));
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        size: "med",
                        count: 1
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }]});
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        count: 2
                    },null,{
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]});
                    expect(order.get("items")).to.deep.equal([{
                        id: 1,
                        desc:"laptop",
                        // size: "med", //TODO ???
                        count: 2
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }, {
                        id: 3,
                        desc:"broccoli",
                        count: 2
                    }]);
                });

                /**
                 * disabling this test for now - need to give more
                 * thought to how nesting of non-backbone containers
                 * should behave
                 */
                it('should overlay arrays also', function(){
                    /*jshint -W027*/
                    return; // disable the test

                    var order = _.extend(new Backbone.Model(), nestify({}, {update:"merge"}));
                    order.set({items: [{
                        id: 1,
                        desc:"laptop",
                        size: "med",
                        count: 1
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }]});

                    order.set("items|0|count", 2);
                    order.set("items|2|id", 3);
                    order.set("items|2|count", 2);

                    expect(order.get("items")).to.deep.equal([{
                        id: 1,
                        desc:"laptop",
                        // size: "med", //TODO ???
                        count: 2
                    }, {
                        id: 2,
                        desc:"celery",
                        count: 1
                    }, {
                        id: 3,
                        count: 2
                    }]);
                });

                it('should by default work just like Backbone', function(){

                    var unDFynd;
                    var set1 = {
                        account: {
                            id: "A",
                            email: "a@hotmail.com"
                        },
                        items: [{
                            id: 1,
                            size: "med",
                            count: 1
                        }, {
                            id: 2,
                            desc:"celery",
                            count: 1
                        }]
                    };
                    var set2 = {
                        account: {
                            email: "a@geocities.com"
                        },
                        items: [unDFynd, {
                            id: 3,
                            desc:"broccoli",
                            count: 2
                        }, {
                            id: 1,
                            size: "med",
                            count: 2
                        }]
                    };
                    var expected = set2;

                    var order = _.extend(new Backbone.Model(), nestify());
                    var order0 = new Backbone.Model();
                    order.set(set1);
                    order.set(set2);
                    order0.set(set1);
                    order0.set(set2);

                    expect(order.attributes).to.deep.equal(expected);
                    expect(order0.attributes).to.deep.equal(expected);
                });

                it('should by default work just like Backbone (simple)', function(){
                    var set1 = {
                        account: {
                            id: "A",
                            email: "a@hotmail.com"
                        }
                    };
                    var set2 = {
                        account: {
                            email: "a@geocities.com"
                        }
                    };
                    var expected = set2;

                    var order = _.extend(new Backbone.Model(), nestify());
                    var order0 = new Backbone.Model();
                    order.set(set1);
                    order.set(set2);
                    order0.set(set1);
                    order0.set(set2);

                    // expect(order.attributes).to.deep.equal(expected);
                    expect(order0.attributes).to.deep.equal(expected);

                });

            });

        });

        /**
         * Test 'private' pathToObject function
         */
        describe('pathToObject', function(){
            it('should convert JSON to nested path form', function(){
                var expected = {foo: "bar"};
                expect(nestify._pathToObject("foo", "bar")).to.deep.equal(expected);
            });

            it('should convert JSON to nested path form', function(){
                var expected = {foo: {bar: "Baz"}};
                expect(nestify._pathToObject(expected)).to.deep.equal(expected);
                expect(nestify._pathToObject(["foo", "bar"], "Baz")).to.deep.equal(expected);
            });

            it('should convert JSON with array to nested path form', function(){
                var expected = {foo: [{baz: "Goo"}]};
                expect(nestify._pathToObject(expected)).to.deep.equal(expected);
                expect(nestify._pathToObject(["foo", 0, "baz"], "Goo")).to.deep.equal(expected);
            });

            it('should convert JSON with array to nested path form', function(){
                var expected = {foo: {bar: [, , {baz: "Goo"}]}};
                expect(nestify._pathToObject(expected)).to.deep.equal(expected);
                expect(nestify._pathToObject(["foo", "bar", 2, "baz"], "Goo")).to.deep.equal(expected);
            });

            it('should convert JSON with null value to nested path form', function(){
                var expected = {foo: {bar: null}};
                expect(nestify._pathToObject(["foo", "bar"], null)).to.deep.equal(expected);
            });

            it('should convert JSON with undefined value to nested path form', function(){
                var un_D_fined;
                var expected = {foo: {bar: un_D_fined}};
                expect(nestify._pathToObject(["foo", "bar"], un_D_fined)).to.deep.equal(expected);
            });

            it('should convert JSON with undefined value to nested path form', function(){
                var un_D_fined = void 0;
                var expected = {foo: [{bar: un_D_fined}]};
                expect(nestify._pathToObject(["foo", 0, "bar"], un_D_fined)).to.deep.equal(expected);
            });
        });

        /** test 'private' properNum function, issue #4 */
        describe('properNum', function(){
            it('should (only) parse stringified simple integers into Numbers, leaving everything else as Strings ', function(){
                expect(nestify._properNum("foo")).to.equal("foo");
                expect(nestify._properNum(13)).to.equal(13);
                expect(nestify._properNum("13")).to.equal(13);
                // hex is a no-no
                expect(nestify._properNum("5fa9")).to.equal("5fa9");
                // UUIDs is a no-no
                expect(nestify._properNum("531f2d1d-5fa9-49eb-bfcb-8d269ae283d9")).to.equal("531f2d1d-5fa9-49eb-bfcb-8d269ae283d9");
                // arithmetic expression is a no-no
                expect(nestify._properNum("3-2")).to.equal("3-2");                
            });
        });

        describe('more complex example', function(){

            it('should nest properly via constructor construction', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });

            it('should nest properly via setter construction', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                // construction
                items.add(item1);
                items.add(item2);
                order.set("items", items);
                orders.add(order);
                account.set("orders", orders);

                // expectations
                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });

            it('should nest properly via setter construction, alternate ordering', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                // construction
                account.set("orders", orders);
                orders.add(order);
                order.set("items", items);
                items.add(item1);
                items.add(item2);

                // expectations
                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });
        });

        /**
         * Test that the presence of 'attributes' property in 
         * non-Backbone model doesn't break stuff
         */
        describe('attribute named "attribute"', function(){
            it('should not break', function(){
                var a = new env.Account({foo:{attributes:{msg:"haha"}}});
                expect(a.get("foo|attributes|msg")).to.equal("haha");
            });

            it('should not break; distinct models', function(){
                var acct = new env.Account({attributes: {msg: "haha"}});
                var cart = new env.ShoppingCart({account:acct});
                expect(cart.get("account|attributes|msg")).to.equal("haha");
            });
        });

        describe("calling 'set' with Model instance", function(){
            it("should produce duplicate model", function(){
                var cart = new env.ShoppingCart();
                var cart0 = new env.ShoppingCart({account: {id: 8}});
                cart.set(cart0);
                expect(cart.toJSON()).to.deep.equal(cart0.toJSON());
            });
        });

        /**
         * Everything is 'existy' except null and undefined.
         */
        describe('test setting values of different existy-ness', function(){
            it("should not set values that aren't existy.", function(){
                var acct = new env.Account();
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", true);
                cart.set("account|nope", false);
                cart.set("account|aNull", null);
                cart.set("account|aUndef", env.unDFynd);
                expect(acct.get("truDat")).to.be.true;
                expect(acct.get("nope")).to.be.false;
                expect(acct.get("aNull")).to.be.null;
                expect(acct.get("aUndef")).to.be.undefined;
            });
        });

        /**
         * Everything is 'existy' except null and undefined.
         */
        describe('changing based on existy-ness', function(){
            it("should make changes given values that are existy.", function(){
                var acct = new env.Account({"truDat":false,
                                            "nope":true});
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", true);
                cart.set("account|nope", false);
                expect(acct.get("truDat")).to.be.true;
                expect(acct.get("nope")).to.be.false;
            });
            /*TODO?
            it("should not make change given values that are not existy.", function(){
                var acct = new env.Account({"truDat":false,
                                            "nope":true});
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", null);
                cart.set("account|nope", env.unDFynd);
                expect(acct.get("truDat")).to.be.false;
                expect(acct.get("nope")).to.be.true;
            });
             */
        });

        describe('unset', function(){

            it('should unset in a nested model', function(){
                var cart = new env.ShoppingCart({account: {id: 4}});
                expect(cart.get("account|id")).to.equal(4);
                cart.unset("account|id");
                expect(cart.get("account|id")).to.be.undefined;
            });

            it('should unset a non-nested attribute', function(){
                var acct = new env.Account({id: 4});
                expect(acct.get("id")).to.equal(4);
                acct.unset("id");
                expect(acct.get("id")).to.be.undefined;
            });

            it('should unset silently', function(){
                var acct = new env.Account();
                var cart = new env.ShoppingCart();
                cart.set({account: acct});
                acct.set({id: 8});
                cart.on("change", assert.fail);
                acct.on("change", assert.fail);
                cart.unset("account|id", {silent:true});
            });

            it('should unset with a Collection', function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.unset("items|0|spicy");
                expect(item.get("spicy")).to.be.undefined;
            });

            it('should unset a Collection', function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.unset("items");
                expect(order.get("items")).to.be.undefined;
            });
        });

        describe('clear', function(){
            it("should clear all nested", function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.clear();
                expect(order.attributes).to.be.empty;
            });
        });

        describe('nested Collection get(), at(), remove(), length', function(){
            it("should remove model at, reflect in length attribute", function(){
                var ctrl = new Backbone.Collection([{id: "1", foo: "Foo"}, 
                                                    {id: "2", bar: "Bar"}]);
                expect(ctrl.length).to.equal(2);
                ctrl.remove(ctrl.at(1));
                expect(ctrl.length).to.equal(1);


                var c = nestify.instance(
                    new Backbone.Collection([{id: "1", foo: "Foo"}, 
                                             {id: "2", bar: "Bar"}]),
                    nestify.auto());
                expect(c.length).to.equal(2);
                c.remove(c.at(1));
                expect(c.length).to.equal(1);
            });

            // issue #5
            it("should work on nested Collections", function(){
                var C = Backbone.Collection.extend(),
                    M = Backbone.Model.extend(nestify({ms: C}));
                C.prototype.model = M;
                var m = new M({ms: [{id: "1", foo: "Foo"}, 
                                    {id: "2", bar: "Bar"}]}),
                    c = m.get("ms");
                expect(c.length).to.equal(2);
                c.remove(c.at(1));
                expect(c.length).to.equal(1);
            });

            // issue #5
            it("smart merge workaround", function(){
                var C = Backbone.Collection.extend(),
                    M = Backbone.Model.extend(nestify({ms: C}));
                C.prototype.model = M;
                var m = new M();
                m.set({ms: [{id: "1", foo: "Foo"}, 
                            {id: "2", bar: "Bar"}]},
                     {update: "smart"});
                var c = m.get("ms");
                expect(c.length).to.equal(2);
                c.remove(c.at(1));
                expect(c.length).to.equal(1);
            });

            // issue #5
            it("should work on nested Collections (auto nestify)", function(){
                var m = nestify.instance(
                    new Backbone.Model({ms: [{id: "1", foo: "Foo"}, 
                                             {id: "2", bar: "Bar"}]}),
                    nestify.auto()),
                    c = m.get("ms");
                expect(c.models.length).to.equal(2);
                expect(c.length).to.equal(2);
                c.remove(c.at(1));
                expect(c.models.length).to.equal(1);
                expect(c.length).to.equal(1);
            });

            // issue #5
            it("should not corrupt state of Collection", function(){
                var m = nestify.instance(
                    new Backbone.Model({ms: [{id: "1", foo: "Foo"}, 
                                             {id: "2", bar: "Bar"}]}),
                    nestify.auto()),
                    c = m.get("ms"),
                    m1 = c.at(0);
                expect(c.get(m1)).to.deep.equal(m1);
                expect(c.get(m1.id)).to.deep.equal(m1);
            });
        });

        describe('unspecified Collection', function(){
            it('will still be updated according to "update" option', function(){

                var m = _.extend(new Backbone.Model({
                    items: new Backbone.Collection([
                        new Backbone.Model({id:1, name:"toothpaste"}),
                        new Backbone.Model({id:2, name:"chowder"})
                    ])
                }), nestify());

                expect(m.get('items')).to.be.an.instanceof(Backbone.Collection);
                expect(m.get('items').length).to.equal(2);
                expect(m.get('items|0|id')).to.equal(1);
                expect(m.get('items|1|id')).to.equal(2);

                m.set({
                    items: [{id:3, name: "waffle"}]
                });
                expect(m.get('items')).to.be.an.instanceof(Backbone.Collection);
                expect(m.get('items').length).to.equal(2);
                expect(m.get('items|0|id')).to.equal(3);
                expect(m.get('items|1|id')).to.equal(2);
            });
        });

        describe('unspecified Model', function(){
            it('will still be updated according to "update" option', function(){

                var m = _.extend(new Backbone.Model({
                    item: new Backbone.Model({id:1, name:"toothpaste"}),
                    exchange: new Backbone.Model({id:2, name:"chowder"})
                }), nestify());

                m.set({
                    item: {id:3, name: "waffle"}
                });
                expect(m.get('item')).to.be.an.instanceof(Backbone.Model);
                expect(m.get('item|id')).to.equal(3);
                expect(m.get('exchange|id')).to.equal(2);
            });
        });


        describe('spec API', function(){

            it('should contain only modified methods', function(){
                var spec = nestify({
                    'orders':{constructor:env.Orders}
                });
                
                expect(_.keys(spec)).to.deep.equal(["get","set", "hasChanged"]);
            });
            
            it('should allow nil config', function(){
                var spec = nestify();

                expect(_.keys(spec)).to.deep.equal(["get","set", "hasChanged"]);
            });

            it('can be mixed into individual Model instance', function(){
                var spec = nestify({
                    'orders':{constructor:env.Orders}
                });

                var m1 = new Backbone.Model(),
                    m2 = new Backbone.Model(),
                    input = {
                        orders: [
                            {id:1},
                            {id:2}
                        ]
                    };
                _.extend(m2, spec);
                m1.set(input);
                m2.set(input);
                
                expect(m1.get('orders')).to.be.an.instanceof(Array);
                expect(m2.get('orders')).to.be.an.instanceof(env.Orders);
            });


            describe('Model/Collection constructor spec', function(){

                it("can be abbreviated if it's only a constructor fn", function(){
                    var spec = nestify({
                        'order':env.Order
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    expect(model.get('order')).to.be.an.instanceof(env.Order);
                    expect(model.get("order|id")).to.equal(2112);
                });

                it('can contain additional args', function(){
                    var spec = nestify({
                        'order':{constructor:env.Order,
                                 args: {backordered:"2113-11-29"}}
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    expect(model.get("order|backordered")).to.equal("2113-11-29");
                });

                it('can contain an arbitrary container function', function(){
                    var o = new env.Order();
                    var spec = nestify({
                        'order': {
                            constructor: function(v, existing, opts){
                                return o;
                            }
                        }
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    expect(o.get("id")).to.equal(2112);
                });

                it('can contain a nested spec for a constructor', function(){
                    var spec = nestify({
                        'order':{constructor:Backbone.Model,
                                 spec: {item:env.Item}
                                }
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{item: {id: 2112}}});
                    expect(model.get('order|item')).to.be.an.instanceof(env.Item);
                    expect(model.get("order|item|id")).to.equal(2112);
                });
            });

            describe('Object/Array constructor spec', function(){

                it('basically works', function(){
                    var spec = nestify({
                        'notes':Array 
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set("notes|0", "Note0");
                    expect(model.get("notes")).to.deep.equal(["Note0"]);
                    expect(model.get("notes|0")).to.equal("Note0");
                });

                it('behaves same as if container were not specified', function(){
                    var model = _.extend(new Backbone.Model(), nestify());
                    model.set("notes|0", "Note0");
                    expect(model.get("notes")).to.deep.equal(["Note0"]);
                    expect(model.get("notes|0")).to.equal("Note0");
                });

                it('does not pass any args to Object constructor function', function(){
                    var spec = nestify({
                        'notes': {constructor: Object,
                                  opts: {not: "a real opt"},
                                  args: "nope"}
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set("notes|n1", "Note1", {update: "merge"});
                    expect(model.get("notes")).to.deep.equal({n1: "Note1"});
                });

                it('does not pass any args to Array constructor function', function(){
                    var spec = nestify({
                        'notes': {constructor: Array,
                                  opts: {not: "a real opt"},
                                  args: "nope"}
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set("notes|2", "Note0", {update: "merge"});
                    // have to infer from empty slots that no args 
                    // were passed to constructor
                    expect(model.get("notes")).to.deep.equal([unDfynd, unDfynd, "Note0"]);
                });

                /** TODO this feature is undocumented and subject to change */
                it('can contain nestify opts for just that container', function(){
                    var spec = nestify({
                        'notes':{constructor:Array,
                                 opts: {update:"merge"},
                        'nopes': Array}
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    // updated with 'merge'
                    model.set("notes|0", "Note0");
                    model.set("notes|1", "Note1");
                    expect(model.get("notes")).to.deep.equal(["Note0","Note1"]);
                    // updated with 'reset' rather than 'merge'
                    model.set("nopes", []);
                    model.set("nopes|0", "Nope0");
                    model.set("nopes|1", "Nope1");
                    expect(model.get("nopes")).to.deep.equal([,"Nope1"]);
                });

            });

            /**
             * For advanced specification...
             *
             * The spec can be thought of as a list of matcher/container
             * pairs. The simple object hash is, in effect, a list of
             * String attribute names (matched with '===') paired with
             * containers.
             */
            describe('expanded spec list syntax', function(){

                it('has equivalent to top-level function', function(){

                    /**
                     * By passing a list, you are opting in to the
                     * more advanced syntax
                     */
                    var spec = nestify([{
                        hash: {order:env.Order,
                               item:env.Item}
                    }], {delim:"."});

                    /** equivalent to this: */
                    var spec2 = nestify({
                        order:env.Order,
                        item:env.Item
                    }, {delim:"."});

                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    model.set({item:{id:5150}});
                    expect(model.get('order')).to.be.an.instanceof(env.Order);
                    expect(model.get("order.id")).to.equal(2112);
                    expect(model.get('item')).to.be.an.instanceof(env.Item);
                    expect(model.get("item.id")).to.equal(5150);
                });

                it('can have regex matchers', function(){

                    var spec = nestify([{
                        match: /ord/,
                        container: env.Order
                    }], {delim:"."});
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({
                        order:{id:2112},
                        ordur:{id:2113},
                        odor:{id:2114}
                    });
                    expect(model.get('order')).to.be.an.instanceof(env.Order);
                    expect(model.get("order.id")).to.equal(2112);
                    expect(model.get('ordur')).to.be.an.instanceof(env.Order);
                    expect(model.get("ordur.id")).to.equal(2113);
                    expect(model.get('odor')).not.to.be.an.instanceof(env.Order);
                    expect(model.get('odor')).to.be.an.instanceof(Object);
                    expect(model.get("odor.id")).to.equal(2114);
                });

                it('can have String matchers', function(){

                    var spec = nestify([{
                        match: "ord",
                        container: env.Order
                    }], {delim:"."});
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({
                        order:{id:2112},
                        ord:{id:2113}
                    });
                    expect(model.get('order')).not.to.be.an.instanceof(env.Order);
                    expect(model.get('order')).to.be.an.instanceof(Object);
                    expect(model.get("order.id")).to.equal(2112);
                    expect(model.get('ord')).to.be.an.instanceof(env.Order);
                    expect(model.get("ord.id")).to.equal(2113);
                    expect(model.get('ord')).to.be.an.instanceof(env.Order);
                });

                it('can have predicate function matchers', function(){
                    var spec = nestify([{
                        match: function(attr, val, existing, opts){
                            return attr.length === opts.matchForLength;
                        },
                        container: Backbone.Model
                    }], {delim:".",
                         matchForLength:3});

                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({
                        fo:{id:2112},
                        fo3:{id:2113},
                        foe:{id:2114},
                        four:{id:2115}
                    });

                    expect(model.get('fo3')).to.be.an.instanceof(Backbone.Model);
                    expect(model.get("fo3.id")).to.equal(2113);
                    expect(model.get('foe')).to.be.an.instanceof(Backbone.Model);
                    expect(model.get("foe.id")).to.equal(2114);
                    expect(model.get('fo')).not.to.be.an.instanceof(Backbone.Model);
                    expect(model.get('fo')).to.be.an.instanceof(Object);
                    expect(model.get("fo.id")).to.equal(2112);
                    expect(model.get('four')).not.to.be.an.instanceof(Backbone.Model);
                    expect(model.get('four')).to.be.an.instanceof(Object);
                    expect(model.get("four.id")).to.equal(2115);
                });

                it('omitted "matcher" means match all', function(){

                    var spec = nestify([{
                        container: Backbone.Model
                    }], {delim:"."});
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({
                        order:{id:2112},
                        ord:{id:2113}
                    });
                    expect(model.get('order')).to.be.an.instanceof(Backbone.Model);
                    expect(model.get('ord')).to.be.an.instanceof(Backbone.Model);
                });

            });

            describe('example usage', function(){

                it('properly nests complex JSON into proper Models and Collections', function(){

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

                    var shoppingCart = new env.ShoppingCart(shoppingCartJSON);

                    var anItem = shoppingCart.get("account|orders|1|items|0");
                    expect(anItem).to.be.an.instanceof(env.Item);
                    expect(anItem.get("itemID")).to.equal("sd23");
                    expect(shoppingCart.get(["pending","items",0,"itemID"])).to.equal("bk28");
                });
            });

            describe('convenience functions', function(){

                describe('nestify.auto()', function(){
                    /**
                     * A convenience to create a spec that will simply
                     * auto-nest into plain vanilla Backbone Models or
                     * Collections. No config necessary.
                     */
                    it('can create an auto-nest spec', function(){
                        var spec = nestify.auto({delim:"."});
                        var model = _.extend(new Backbone.Model(), spec);

                        model.set("order.items.0.id", 2112);
                        expect(model.get('order')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).to.be.an.instanceof(Backbone.Collection);
                        expect(model.get('order.items.0')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get("order.items.0.id")).to.equal(2112);

                        model.set({order:{items: [{id: 2113}]}});
                        expect(model.get('order')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).to.be.an.instanceof(Backbone.Collection);
                        expect(model.get('order.items.0')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get("order.items.0.id")).to.equal(2113);
                    });

                    it('can create an auto-nest spec, simple', function(){
                        var model = _.extend(new Backbone.Model(), nestify.auto());
                        model.set({"A2112":{name: "foo"}});
                        expect(model.get("A2112|name")).to.equal(model.get("A2112").get("name"));
                        model.clear();
                        model.set({"2112":{name: "foo"}});
                        // have to use array syntax, otherwise '2112' is parsed as a Number
                        expect(model.get(["2112","name"])).to.equal(model.get("2112").get("name"));
                    });

                    /* issue #2 */
                    it('does not create spurious properties on model', function(){
                        var spec = nestify.auto({delim:"."});
                        var model = new Backbone.Model();
                        var propertyCount = _.size(model);
                        model = _.extend(new Backbone.Model(), spec);
                        /**
                         * expected property count, after mixin, is
                         * plus two to account for new 'get' and 'set'
                         * methods on the model.
                         */
                        expect(_.size(model)).to.equal(propertyCount + 3);
                        model.set({2112:{name: "foo"}});
                        var nested = model.get("2112");
                        expect(_.size(nested)).to.equal(propertyCount);

                    });

                    /* issue #3 */
                    it('ignores arrays of non-objects', function(){
                        var spec = nestify.auto({delim:"."});
                        var model = _.extend(new Backbone.Model(), spec);

                        model.set({order:{items: ["one", 2, "three"]}});
                        expect(model.get('order')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).not.to.be.an.instanceof(Backbone.Collection);
                        expect(model.get('order.items')).not.to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).to.be.an.instanceof(Array);
                        expect(model.get('order.items.0')).to.equal("one");
                        expect(model.get('order.items.1')).to.equal(2);
                    });

                    it('ignores arrays unless they only contain objects', function(){
                        var spec = nestify.auto({delim:"."});
                        var model = _.extend(new Backbone.Model(), spec);

                        model.set({order:{items: ["one", 2, {three: "Three"}, "four"]}});
                        expect(model.get('order')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).not.to.be.an.instanceof(Backbone.Collection);
                        expect(model.get('order.items')).not.to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items')).to.be.an.instanceof(Array);
                        expect(model.get('order.items.0')).to.equal("one");
                        expect(model.get('order.items.1')).to.equal(2);
                        expect(model.get('order.items.2')).not.to.be.an.instanceof(Backbone.Model);
                        expect(model.get('order.items.2')).to.be.an.instanceof(Object);
                    });

                    it('can get, set into containers', function(){
                        var model = new (Backbone.Model.extend(nestify.auto()))({
                            "A1":{
                                simple:7,
                                "simple-array":[8],
                                model:{
                                    nested: "foo"
                                },
                                collection: [{
                                    nested: "bar"
                                }, {
                                    nested: "baz"
                                }]
                            }
                        });

                        // get
                        expect(model.get('A1|simple')).to.equal(7);
                        expect(model.get('A1|simple-array|0')).to.equal(8);
                        expect(model.get('A1|model|nested')).to.equal("foo");
                        expect(model.get('A1|collection|0|nested')).to.equal("bar");
                        expect(model.get('A1|collection|1|nested')).to.equal("baz");

                        // set
                        model.set('A1|simple', 12);
                        model.set('A1|simple-array|0', 13);
                        model.set('A1|model|nested', "goo");
                        model.set('A1|collection|0|nested', "gar");
                        model.set('A1|collection|1|nested', "gaz");

                        expect(model.get('A1|simple')).to.equal(12);
                        expect(model.get('A1|simple-array|0')).to.equal(13);
                        expect(model.get('A1|model|nested')).to.equal("goo");
                        expect(model.get('A1|collection|0|nested')).to.equal("gar");
                        expect(model.get('A1|collection|1|nested')).to.equal("gaz");

                        // set json
                        model.set({A1: {"simple-array": [14]}});
                        expect(model.get('A1|simple-array|0')).to.equal(14);

                        // update array, replaces by default
                        model.set('A1|simple-array|0', 22);
                        model.set('A1|simple-array|1', 23);
                        expect(model.get('A1|simple-array|0')).to.be.undefined;
                        expect(model.get('A1|simple-array|1')).to.equal(23);

                        // update array with 'merge' option
                        model.set('A1|simple-array|0', 32, {update:"merge"});
                        model.set('A1|simple-array|1', 33, {update:"merge"});
                        expect(model.get('A1|simple-array|0')).to.equal(32);
                        expect(model.get('A1|simple-array|1')).to.equal(33);
                    });

                    it('passes options to Model.extend, constructor', function(){
                        var mixin = nestify.auto({extend: {idAttribute: "fooid"},
                                                  args: {bonus: "thingy"}}),
                            M = Backbone.Model.extend(mixin),
                            m = new M();

                        m.set({nested: {fooid: "ou812"}});

                        expect(m.get('nested').id).to.equal("ou812");
                        expect(m.get('nested|bonus')).to.equal("thingy");
                    });

                    it('revelytix smoke test', function(){
                        var spec = nestify.auto({delim:"."});
                        var testjson = {
                            "2112-5150":{
                                "duration":79274,
                                "status":"completed",
                                "name":"foo",
                                "id":"2112-5150",
                                "type":["BarType"],
                                "modifiedBy":"2113-OU812"
                            }
                        };
                        var model = _.extend(new Backbone.Model(), spec);
                        model.set(testjson);
                        expect(model.get('2112-5150')).to.be.an.instanceof(Backbone.Model);
                        expect(model.get('2112-5150.id')).to.equal("2112-5150");
                        expect(model.get('2112-5150.duration')).to.equal(79274);
                        expect(model.get('2112-5150.type')).not.to.be.an.instanceof(Backbone.Collection);
                        expect(model.get('2112-5150.type')).not.to.be.an.instanceof(Backbone.Model);
                        expect(model.get('2112-5150.type')).to.be.an.instanceof(Array);
                        expect(model.get('2112-5150.type.0')).to.equal("BarType");
                    });

                });

                describe('nestify.instance()', function(){
                    it('can nestify an existing Model instance', function(){
                        var model = new Backbone.Model({items: [{name:"monkey"}, {name:"butter"}]});
                        model = nestify.instance(model, nestify({items: env.Items}, {delim: "."}));
                        expect(model.get('items')).to.be.an.instanceof(env.Items);
                        expect(model.get('items.0')).to.be.an.instanceof(env.Item);
                        expect(model.get("items.0.name")).to.equal("monkey");
                    });

                    it('will safely handle attempting to nestify-instance a non-Model', function(){
                        nestify.instance("not a model", nestify({items: env.Items}));
                    });

                    it('will nestify with an empty spec by default', function(){
                        var m = new Backbone.Model({foo: new Backbone.Model()}),
                            n = m.get("foo");
                        m = nestify.instance(m);
                        m.set("foo|bar", "baz");
                        expect(n.get("bar")).to.equal("baz");
                    });
                });
            });
        });

        describe('hasChanged function', function(){

            var reset = function(){
                var ms = Array.prototype.slice.call(arguments);
                _.each(ms, function(m){
                    m.changed = {};
                });
            };

            it('should work as before by default', function(){
                var m = new Backbone.Model(),
                    n = new Backbone.Model();
                m = nestify.instance(m);
                m.set({foo: n});
                m.set("foo|bar", "baz");
                reset(m, n);
                expect(n.hasChanged()).to.be.false;
                expect(m.hasChanged()).to.be.false;

                // test
                n.set({bar:"buz"});
                expect(n.hasChanged()).to.be.true;
                expect(m.hasChanged()).to.be.false;
                expect(n.hasChanged("bar")).to.be.true;
                expect(m.hasChanged("foo")).to.be.false;
            });

            it('should support optional "nested" option', function(){
                var m = new Backbone.Model(),
                    n = new Backbone.Model();
                m = nestify.instance(m);
                m.set({foo: n});
                m.set("foo|bar", "baz");
                reset(m, n);
                expect(n.hasChanged()).to.be.false;
                expect(m.hasChanged({nested:true})).to.be.false;
                expect(m.hasChanged("foo", {nested:true})).to.be.false;

                // test
                n.set({bar:"buz"});
                expect(n.hasChanged()).to.be.true;
                expect(m.hasChanged({nested:true})).to.be.true;
                expect(n.hasChanged("bar")).to.be.true;
                expect(m.hasChanged("foo", {nested:true})).to.be.true;
            });

            it('should support nestify attr syntax with "nested" option', function(){
                var m = new Backbone.Model(),
                    n = new Backbone.Model();
                m = nestify.instance(m);
                m.set({foo: n});
                m.set("foo|bar", "baz");
                reset(m, n);
                expect(n.hasChanged()).to.be.false;
                expect(m.hasChanged({nested:true})).to.be.false;
                expect(m.hasChanged("foo|bar", {nested:true})).to.be.false;
                expect(m.hasChanged(["foo","bar"], {nested:true})).to.be.false;

                // test
                n.set({bar:"buz"});
                expect(n.hasChanged()).to.be.true;
                expect(m.hasChanged({nested:true})).to.be.true;
                expect(n.hasChanged("bar")).to.be.true;
                expect(m.hasChanged("foo|bar", {nested:true})).to.be.true;
                expect(m.hasChanged(["foo","bar"], {nested:true})).to.be.true;
            });

            it('should support this corner case', function(){
                var c = new Backbone.Model({baz:"Baz"}),
                    b = new Backbone.Model({bar: c}),
                    a = new Backbone.Model({foo: b});
                a = nestify.instance(a);
                reset(a, b, c);
                c.set({baz: "BAAGHS!"});
                expect(a.hasChanged("foo|bar")).to.be.false;
                expect(a.hasChanged("foo|bar|baz")).to.be.true;
                expect(a.hasChanged("foo|bar", {nested:true})).to.be.true;
                expect(a.hasChanged("foo|bar|baz", {nested:true})).to.be.true;
            });

            it('should support nested Collections', function(){
                var c1 = new Backbone.Model({baz1:"Baz1"}),
                    c2 = new Backbone.Model({baz:"Baz"}),
                    cs = new Backbone.Collection([c1, c2]),
                    b = new Backbone.Model({bars: cs}),
                    a = new Backbone.Model({foo: b});
                a = nestify.instance(a);
                reset(a, b, c1, c2);
                c2.set({baz: "BAAGHS!"});

                expect(a.hasChanged("foo|bars")).to.be.false;
                expect(a.hasChanged("foo|bars|1|baz")).to.be.true;
                expect(a.hasChanged("foo|bars", {nested:true})).to.be.true;
                expect(a.hasChanged("foo|bars|1|baz", {nested:true})).to.be.true;
            });

            it('should work for incorrect/nonexistent paths', function(){
                var a = new Backbone.Model();
                a = nestify.instance(a);
                expect(a.hasChanged("foo|bar")).to.be.false;
            });
        });

        /* just some API doodling */
        var example = function(){
            /* global FooModel, BarModel, BazModel, m */

            // 1.
            nestify({
                foo: FooModel,
                bar: BarModel
            });

            // 2. equivalent to:
            nestify([{
                hash: {foo: FooModel,
                       bar: BarModel}
            }]);

            // 3. full-blown example:
            nestify([{
                hash: {foo: FooModel,
                       bar: BarModel}
            },{
                match: /abc/,
                container: BarModel
            },{
                match: function(){return true;},
                container: BarModel
            },{
                // default case, no 'matcher'
                container: {
                    constructor: BazModel,
                    update: "merge", //"reset", "merge", "smart"
                    args: {argle:"bargle"}
                }
            }],{ // optional 'opts' arg
                delim: "."
            });

            // nestify a Class
            nestify(FooModel);

            // nestify a Class
            nestify(FooModel, {bar: BarModel}, {delim:"."});

            // nestify an instance
            nestify(new Backbone.Model());

            // auto-nesting?
            nestify.autoNest();
            nestify.autoNest(m);
            nestify.autoNest({delim:"."});
            nestify.autoNest(m, {delim:"."});
            nestify(m, {}, {delim:".", 
                            autoNest:true});
            nestify(m, nestify.specs.auto);
            nestify.auto(m, {});
                       

        };


        /*
         * TODO
         *
         * API
         * -auto-nest needs work
         * -nestify an existing instance
         * -option to allow overwriting existing containers 
         * -convenience alternatives to nestify Models/Collections constructors or instances
         * -provide convenience matchers, namespaced
         * -container 'args': 'apply' so it can be a list of args
         *
         * FEATURES
         * -events of nested models
         *
         * BUGS
         * -behavior of 'clear', 'unset'?
         * -updating unspec'ed objects, arrays (compare to native Backbone)
         * -probably shouldn't allow Backbone.Model or
         *  Backbone.Collection constructors themselves to be modified
         * -nestify delegates directly to Backbone.Model.prototype getter/setter
         *
         * DOCUMENTATION
         * -container: attribute value which can hold nested attributes
         * --one of: Model, Collection, Array, Object, Function?
         * --any of these are indexable by nestify syntax
         * --merging containers policy?
         *
         * DIST
         * -source map
         *
         * OPTIMIZATIONS
         * -caching/memoizing (if need be, and document)
         *  -caching might need to be disabled if user wants side-effecty matcher functions
         * -type of container can be inferred up front in all cases
         *  except a 'container' function, since it's a black box until run time.
         */
    });
}));
