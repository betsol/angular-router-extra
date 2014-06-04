(function(window, angular) {
    'use strict';

    angular.module('ngRouterExtra', ['ng', 'ngRouter'])
        .provider('routerExtra', ['routerProvider', RouterProviderExtra])
    ;

    /**
     * Router provider extra.
     * @param {Object} routerProvider
     * @constructor
     */
    function RouterProviderExtra(routerProvider)
    {
        var transformers = [];
        var pendingRoutes = [];
        var delayRouteRegistration = false;
        var predefinedTransformers = {};

        /**
         * Whether to delay routes registration.
         * @param {bool} value
         */
        this.delayRouteRegistration = function(value) {
            delayRouteRegistration = (value ? true : false);
            // Maintaining chainability.
            return this;
        };

        /**
         * Adds transformer.
         * @param {function|string} transformer
         * @param {Object} parameters
         * @returns {RouterProviderExtra}
         */
        this.addTransformer = function(transformer, parameters) {
            if ('function' !== typeof transformer) {
                if ('function' == typeof predefinedTransformers[transformer]) {
                    transformer = predefinedTransformers[transformer];
                } else {
                    throw new Error('Parameter "transformer" must be a callback function or a name of pre-defined transformer.');
                }
            }

            transformers.push({
                callable: transformer,
                parameters: parameters
            });

            // Maintaining chainability.
            return this;
        };

        /**
         * Clears transformers.
         * @returns {RouterProviderExtra}
         */
        this.clearTransformers = function() {
            transformers = [];
            // Maintaining chainability.
            return this;
        };

        /**
         * Clearing pending routes.
         * @returns {RouterProviderExtra}
         */
        this.clearPendingRoutes = function() {
            clearPendingRoutes();

            // Maintaining chainability.
            return this;
        };

        /**
         * Manually register pending routes.
         * @returns {RouterProviderExtra}
         */
        this.registerRoutes = function() {
            if (pendingRoutes.length > 0) {
                for (var i in pendingRoutes) {
                    var route = pendingRoutes[i];
                    registerRoute(route);
                }
                clearPendingRoutes();
            }

            // Maintaining chainability.
            return this;
        };

        /**
         * Updated pending named route with additional properties.
         * @param {string} routeName
         * @param {Object} updatedRoute
         * @returns {RouterProviderExtra}
         */
        this.updateRoute = function(routeName, updatedRoute) {
            if (pendingRoutes.length > 0) {
                for (var i in pendingRoutes) {
                    var initialRoute = pendingRoutes[i];
                    if ('undefined' !== typeof initialRoute.name && initialRoute.name == routeName) {
                        angular.extend(initialRoute, updatedRoute);
                    }
                }
            }
            // Maintaining chainability.
            return this;
        };

        /**
         * Adds specified routes.
         * @param {Object} routes
         */
        this.addRoutes = function(routes) {
            for (var key in routes) {
                var route = routes[key];
                var path = ('undefined' !== typeof route.path ? route.path : key);
                this.when(path, route);
            }
            // Maintaining chainability.
            return this;
        };

        /**
         * Proxy method for native router.
         * @param {string} path
         * @param {Object} route
         * @returns {RouterProviderExtra}
         */
        this.when = function(path, route) {
            route.path = path;
            addRoute(route);
            // Maintaining chainability.
            return this;
        };

        this.$get = function() {
            return {};
        };

        /**
         * Central place for adding routes.
         * @param {Object} route
         */
        function addRoute(route)
        {
            // Running transformers on route before anything else.
            if (transformers.length > 0) {
                route = runTransformersOnRoute(route);
            }

            // Registering route.
            if (!delayRouteRegistration) {
                registerRoute(route);
            } else {
                pendingRoutes.push(route);
            }
        }

        /**
         * Runs transformers on specified route.
         * @param {Object} route Initial route.
         * @returns {Object} Transformed route.
         */
        function runTransformersOnRoute(route) {
            for (var i in transformers) {
                var transformer = transformers[i];

                var callable = transformer.callable;

                var parameters = [];
                if ('undefined' != typeof transformer.parameters) {
                    angular.extend(parameters, transformer.parameters);
                }

                parameters.unshift(route);

                route = callable.apply(callable, parameters);
            }
            return route;
        }

        /**
         * Actually registers route with native router.
         * @param {Object} route
         */
        function registerRoute(route)
        {
            routerProvider.when(route.path, route);
        }

        function clearPendingRoutes() {
            pendingRoutes = [];
        }

        /**
         * Transformer to replace Symfony2 router placeholders with Angular ones.
         * @param {Object} route
         * @returns {Object}
         */
        predefinedTransformers['SymfonyPlaceholders'] = function(route) {
            route.path = route.path.replace(/{\s*(.+?)\s*}/g, ':$1');
            return route;
        };

        /**
         * Transformer to generate controller names from named routes.
         * @param {Object} route
         * @param {string} nameDelimiter
         * @param {string} namingStrategy
         * @param {string} suffix
         * @returns {Object}
         */
        predefinedTransformers['ControllersFromNames'] = function(route, nameDelimiter, namingStrategy, suffix) {

            // Handling only named routes.
            if ('undefined' == typeof route.name) {
                return route;
            }

            // Name delimiter.
            if ('undefined' == typeof nameDelimiter) {
                nameDelimiter = '.';
            }

            // Naming strategy.
            if ('undefined' == typeof namingStrategy) {
                namingStrategy = 'PascalCase';
            }

            // Suffix.
            if ('undefined' == typeof suffix) {
                suffix = 'Ctrl';
            }

            var controllerName = '';
            var parts = (route.name).split(nameDelimiter);
            for (var i in parts) {
                var part = parts[i];

                switch (namingStrategy) {
                    case 'camelCase':
                        if (i > 0) {
                            controllerName += part.substr(0, 1).toUpperCase() + part.substr(1);
                        } else {
                            controllerName += part;
                        }
                        break;
                    case 'PascalCase':
                        controllerName += part.substr(0, 1).toUpperCase() + part.substr(1);
                        break;
                    default:
                        throw new Error('Unknown naming strategy: "' + namingStrategy + '"');
                }
            }

            route.controller = controllerName + suffix;

            return route;
        };
    }

})(window, angular);