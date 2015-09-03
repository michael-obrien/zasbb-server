'use strict';

var Chairo = require('chairo');
var Hapi = require('hapi');
var config = require('./config');

var server = new Hapi.Server();
server.connection({ port: 3000 });

var senecaOptions = { log: 'silent' };

server.register({ register: Chairo, options: senecaOptions }, function (err) {});

server.seneca.use('jsonfile-store',{folder:'./cred_db'});

//user credentials for auth.
var users = [];
var services = [];

getCredentials();

//to receive info. from the service discovery process.
server.seneca.listen({port:10199, pin: {cmd: 'config'}});

server.seneca.add({cmd:'config'}, function (msg, done) {
  msg.data.forEach(function (item) {
    services[config.getServiceNumber(item.name)] = item.address;
  });

  //should replace this with a direct call to the database later
  //server.seneca.client({port: 10101, pin: {role:'list',cmd:'credentials'},host:services[1]});
  //if (users.length === 0) {
  //  getCredentials();
  //}

  //see 02_make-post.js
  server.seneca.client({port: 10102, pin: {role:'make',cmd:'post'},host:services[2]});

  //see 03_get-thread.js
  server.seneca.client({port: 10103, pin: {role:'get',cmd:'thread'},host:services[3]});

  //see 04_get-layout.js
  server.seneca.client({port: 10104, pin: {role:'get',cmd:'section'},host:services[4]});

  //see 05_get-threadlist.js
  server.seneca.client({port: 10105, pin: {role:'get',cmd:'threadlist'},host:services[5]});

  //see 09_get-news.js
  server.seneca.client({port: 10109, pin: {role:'get',cmd:'news'},host:services[9]});
  done(null, msg.data);
});

server.register(require('hapi-auth-cookie'), function (err) {
  server.auth.strategy('base', 'cookie', {
    password: 'lmaonobodyandimeannobodywillguessthistextstringever',
    cookie: 'app-cookie',
    isSecure: false
  });
});

function getCredentials() {
  var credentials=server.seneca.make$('credentials')
  credentials.list$( function(err,userList) {
    userList.forEach(function (item) {
      var user = {
        'username': item.username,
        'password': item.password,
        'scope': item.scope.split(','),
        'id': item.id
      }
      users.push(user);
    });
    console.log('User database loaded successfully.');
    //console.log(users);
  });
}
//  server.seneca.act( 'role:list,cmd:credentials', function (err, result) {
//    if (err) {
      //handleme
//      console.error('There was an error retrieving the userlist', err);
//      return;
//    } else {
//      result.listing.forEach(function (item) {
//        var obj = {
//          'username': item.username,
//          'password': item.password,
//          'scope': item.scope.split(','),
//          'id' : item.id
//        }
//        users.push(obj);
//      });
//      console.log('User database loaded successfully.');
//    }
//  });


//authenticates and sets session if user exists in the pre-loaded database.
server.route({
  method: 'POST',
  path: '/api/login',
  config: {
    handler: function(request, reply) {
      var attemptUser = {
        'username': request.payload.username,
        'password': request.payload.password
      };
      
      var account = {};
      users.forEach(function(user, z) {
        if (user.username.toLowerCase() === request.payload.username || user.username === request.payload.username ) {
          account = users[z];
        }
      });

      if (!account || account.password !== request.payload.password) {
        return reply('Login Failed!');

      } else {

        request.auth.session.set(account);
        console.log('User ' + account.username + ' has logged in.');
        return reply( 'Login Success!: ' + account.username );
      }
    }
  }
});

//clear session on logout request.
server.route({
  method: 'GET',
  path: '/api/logout',
  config: {
    handler: function(request, reply) {
      request.auth.session.clear();
      return reply('Logout Successful!');
    }
  }
});

//check session status and current userid. This is checked on page refresh by
//the frontend
server.route({
  method: 'GET',
  path: '/api/insession',
  config: {
    auth: {
      strategy: 'base'
    },
    handler: function(request, reply) {
      if (request.auth.isAuthenticated === true) {
        console.log('User: ' + request.auth.credentials.username + ' checked session status');
        return reply('Session valid: ' + request.auth.credentials.username);
      }
      return reply('Session invalid');
    }
  }
});

//this public route exists to grab specific posts to display on the public
  //'news' section of the frontend
server.route({
  method: 'GET',
  path: '/api/init/{secid}',
  handler: function(request, reply) {
    request.seneca.act( {role:'get', cmd:'news', section:request.params.secid}, function (err, result) {
      if (err) {
        return reply(err);
      }
      return reply(result);
    });
  }
});

//check authentication and perform make post action as applicable.
server.route({
  method: 'POST',
  path: '/api/makepost',
  config: {
    auth: {
      strategy: 'base',
      scope: 'user'
    },
    handler: function(request, reply) {
      if (request.auth.isAuthenticated === true) {
        request.seneca.act( {role:"make",cmd:"post", section:request.payload.section, thread:request.payload.thread, content:request.payload.content, author: request.auth.credentials.username, userid: request.auth.credentials.id, userscope: request.auth.credentials.scope}, function (err, result) {
          if (err) {
            console.log('there was an error:', err);
            return reply('Error creating post');
          }
          //console.log(request.auth.credentials.username + ' posted, something ...');
          return reply(result);
        });
      } else {
        return reply(null, 'Not authorized to post');
      }
    }
  }
});

//Get all posts in a thread. Need to add 'mode: optional' here or create an
  //alternative route for viewing public threads.
server.route({
  method: 'GET',
  path: '/api/thread/{tid}',
  config: {
    auth: {
      strategy: 'base',
      scope: 'user'
    },
    handler: function(request, reply) {
      request.seneca.act( {role:"get",cmd:"thread",id:request.params.tid}, function (err, result) {
        if (err) {
          console.log('there was an error');
          return reply('Request Timed Out. The Page you requested likely doesn\'t exist. Check the address and try again.');
        }
            return reply(result);

        return('You do not have permission to access that resource');
      });
    }
  }
});

//list forum sections / layout. Authentication in this route is optional since
  //some sections are public and should be displayed to all.
server.route({
  method: 'GET',
  path: '/api/section/{sid}',
  config: {
    auth: {
      strategy: 'base',
      mode: 'optional'
    },
    handler: function(request, reply) {
      var userscope = ['public'];
      if (request.auth.isAuthenticated === true) {
        userscope = request.auth.credentials.scope;
      }

      request.seneca.act( {role:"get",cmd:"section",id:request.params.sid, userscope: userscope}, function (err, result) {
        if (err) {
          return reply('Request Timed Out. The Page you requested likely doesn\'t exist. Check the address and try again.');
        }
        return reply(result);
      });
    }
  }
});

//List all posts in a specific section. Needs 'mode:optional' for public
server.route({
  method: 'GET',
  path: '/api/posts/{sid}',
  config: {
    auth: {
      strategy: 'base',
      scope: 'user'
    },
    handler: function(request, reply) {
      console.log('requested: /api/posts/' + request.params.sid)
      request.seneca.act( {role:"get",cmd:"threadlist",id:request.params.sid}, function (err, result) {
        console.log('result:' + result);
        if (err) {
          return reply('Request Timed Out. The Page you requested likely doesn\'t exist. Check the address and try again.');
        }
          return reply(result);
      });
    }
  }
});

//Static File serving from the 'Front' Directory.
server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: 'front',
      listing: true
    }
  }
});

//Need to add some logic to not start until user credentials are loaded.
server.start(function () {
  console.log('Server listening at:', server.info.uri);
});
