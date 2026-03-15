const router = require('./backend/routes/api');

function listRoutes(routes, path = '') {
    // router.stack contains the layers
    routes.stack.forEach(layer => {
        if (layer.route) {
            // It's a route
            const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
            console.log(`${methods} ${path}${layer.route.path}`);
        } else if (layer.name === 'router') {
            // Internal router
            listRoutes(layer.handle, path + layer.regexp.toString());
        }
    });
}

console.log('Registered Routes in api.js:');
listRoutes(router);
process.exit(0);
