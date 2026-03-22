module.exports = {
  apps : [{
    name   : "cookshare-backend",
    script : "./dist/src/server.js",
    env_production : {
      NODE_ENV: "production"
    }
  }]
}
