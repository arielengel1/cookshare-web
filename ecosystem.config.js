module.exports = {
  apps : [{
    name   : "REST SERVER",
    script : "./dist/src/server.js",
    env_production : {
       NODE_ENV: "production"
    }
  }]
}