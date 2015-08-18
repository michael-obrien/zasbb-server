var zasApp = angular.module('zasApp', ['ngRoute']);

zasApp.config(function ($routeProvider) {

  $routeProvider

  .when('/', {
    templateUrl: 'pages/home.html',
    controller: 'homeController'
  })

  .when('/news/:nid', {
    templateUrl: 'pages/home.html',
    controller: 'homeController'
  })

  .when('/auth', {
    controller: 'authController'
  })

  .when('/forum', {
    templateUrl: 'pages/thread.html',
    controller: 'secondController'
  })

  .when('/forum/:sid', {  //section id
    templateUrl: 'pages/thread.html',
    controller: 'secondController'
  })

  .when('/forum/:sid/:tid', {  //section id, thread id (base)
    templateUrl: 'pages/thread.html',
    controller: 'secondController'
  })

  .when('/forum/:sid/:tid/:pid', { //section id, thread id, post id
    templateUrl: 'pages/thread.html',
    controller: 'secondController'
  })

  .when('/post/:sid', { //section id, creating a new thread
    templateUrl: 'pages/postage.html',
    controller: 'postController'
  })

  .when('/post/:sid/:tid', { //section id & threadid, replying to a thread
    templateUrl: 'pages/postage.html',
    controller: 'postController'
  })

  .when('/post/:sid/:tid/:pid', { //section id, threadid, postid, editing a post
    templateUrl: 'pages/postage.html',
    controller: 'postController'
  })

});

//zasApp.run(function($rootScope, $location, $anchorScroll, $routeParams) {
//  //when the route is changed scroll to the proper element.
//  $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
//
//    $location.hash($routeParams.scrollTo);
//    console.log('route changed');
//    $anchorScroll();
//  });
//});

zasApp.service('zasData', function() {
  this.postTitle = '';
  this.lastRequest = '';
});

//custom directive to register 'Enter' key for auth. submit.
zasApp.directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if(event.which === 13) {
        scope.$apply(function (){
          scope.$eval(attrs.ngEnter);
        });
        event.preventDefault();
      }
    });
  };
});


zasApp.controller('authController', ['zasData', '$scope', '$rootScope', '$http', '$routeParams', '$sce', '$timeout', function(zasData, $scope, $rootScope, $http, $routeParams, $sce, $timeout) {

  $scope.checksession = function() {

    $http.get('/api/insession')
      .success(function (result) {
        if (result.indexOf('Session valid: ') === 0) {
          $rootScope.logname = result.replace('Session valid: ', '');
          $rootScope.logstatus = "LOGGED IN!";
        }
      })
      .error(function (data, status) {
        //console.log('session expired or invalid');
      });
  }

  $scope.auth_sub = function() {

    if ($scope.username && $scope.password) {

      $http.post('/api/login', {
        username: $scope.username,
        password: $scope.password
      }).success(function(data) {
        if (data.indexOf('Login Success!: ') === 0) {
          $rootScope.logstatus = 'LOGGED IN!';
          $scope.username = '';
          $scope.password = '';
          $rootScope.logname = data.replace('Login Success!: ', '');
          $rootScope.authmessage = 'Success!';

          $timeout(function() {
            if ($rootScope.authmessage == 'Success!') {
              $rootScope.authmessage = '';
            }
          }, 2000);

        } else if (data == 'Login Failed!') {
          $rootScope.authmessage = 'Login Failed!';
        }
      }).error(function(data, status) {
        $rootScope.authmessage = 'Unspecified server error';
      });

    } else {
      $rootScope.authmessage = 'Missing username or password';
    }
  };

  $scope.typinglogin = function() {
    $rootScope.authmessage = '';
  }

  $scope.logout = function() {

    $http.get('/api/logout')
      .success(function (result) {
        $rootScope.logstatus = "LOGGED OUT!";
        $rootScope.authmessage = 'You were successfully logged out';
        $rootScope.logname = '';
      })
      .error(function (data, status) {
        console.log(data);
      });



    $timeout(function() {
      if ($rootScope.authmessage == 'You were successfully logged out') {
        $rootScope.authmessage = '';
      }
    }, 5000);
  }

}]);


zasApp.controller('homeController', ['zasData', '$scope', '$rootScope', '$http', '$routeParams', '$sce', function(zasData, $scope, $rootScope, $http, $routeParams, $sce) {

  $scope.newsid = 0;
  $scope.author = '';
  $scope.title = '';
  $scope.when = '';
  $scope.pageContent = '';

  if ($routeParams.nid) { //we have thread params, show a thread
    $scope.newsid = $routeParams.nid;
  }

  $http.get('/api/init/' + $scope.newsid)
    .success(function (stuff) {
      console.log('news:', stuff);
      $scope.author = stuff.post.author;
      $scope.title = decodeURI(stuff.post.title);
      $scope.when = stuff.post.when;
      $scope.pageContent = $sce.trustAsHtml(decodeURI(stuff.post.content));
    }).error(function (data, status) {
      console.log('there was an error while getting news.')
    })

}]);



zasApp.controller('postController', ['zasData', '$window', '$scope', '$rootScope', '$location', '$http', '$routeParams', '$sce', function(zasData, $window, $scope, $rootScope, $location, $http, $routeParams, $sce) {

  $scope.location = $location.path();
  $scope.posting_title; //= '';
  $scope.posting_content; //= '';
  $scope.section_title = 'LOL';

  (function() {  // init

    //TEMPORARY
    if ($rootScope.logstatus !== 'LOGGED IN!') {
      alert('You need to be logged in to post. ' +
      'For testing purposes you can use these credentials:' +
      'username: test, password: lolcat');
      $location.path('/');
      $location.replace('/');
    }
    //TEMPORARY

    if (zasData.lastRequest === '') {
      zasData.postTitle = '';
      //we got to this view by some unintended means, let's redirect ..
      var where = $scope.location.replace("post", "forum");
      //zasData.postTitle = $scope.maintitle;
      $location.path(where);
      $location.replace(where);
    } else {
      if (zasData.lastRequest === 'reply') {
        $scope.section_title = 'Post a Reply';
      } else if (zasData.lastRequest === 'new') {
        $scope.section_title = 'Create New Thread';
      }
      $scope.posting_title = zasData.postTitle;
      console.log(zasData.lastRequest);
      zasData.postTitle = '';
      zasData.lastRequest = '';
    }
  })()



  $scope.make_post = function(option) {
    console.log(option, 'was clicked');
    if (option === 'post') {
      var params = $scope.location.split('/');
      var contentString = $scope.posting_title;
      contentString += '###MAIN###CONTENT###';
      contentString += $scope.posting_content;
      if (params.length > 2) {
        if (params[1] === 'post') {
          params.shift();
          params.shift();
          if (params.length === 1) { //BAD HACK, GET A BETTER SOLUTION
            params.push('new');
          }
          console.log('params:',params);
          console.log('$scope.posting_title:',$scope.posting_title);
          console.log('$scope.posting_content',$scope.posting_content);
          $http.post('/api/makepost', {
            section: params[0],
            thread: params[1],
            content: encodeURI(contentString)
          }).success(function(data) {
            console.log(data);

            var redirect = '#/forum/';
            redirect += data.parentid + '/';
            //redirect += data.id + '?scrollTo=';
            redirect += data.id + '/';
            redirect += data.postids.split(',').pop();
            console.log('data:',data);
            console.log('redirect:',redirect);


            $window.location.href = redirect;
          }).error(function(data, status) {
            console.log(data, status)
          });
        }
      }

    }
  }
}]);


zasApp.controller('secondController', ['zasData', '$window', '$scope', '$rootScope', '$location', '$http', '$routeParams', '$sce', function(zasData, $window, $scope, $rootScope, $location, $http, $routeParams, $sce) {



  //$location.path();
  //$scope.section = $routeParams.sid;
  //$scope.thread = $routeParams.tid;
  //$scope.page = $routeParams.pid;
  //$scope.post = $routeParams.pst;
  $scope.location = $location.path();
  $scope.postcount = 0;
  $scope.pageContent = [];
  $scope.contentType = 0; //1: index, 2: section, 3: thread
  $scope.threadinfo = [];


  $scope.make_post = function(option) {
    if (option === 'new') {
      zasData.lastRequest = 'new';
    } else if (option === 'reply') {
      zasData.lastRequest = 'reply';
    }

    var where = $scope.location.replace("forum", "post");

    //if (where.search("#/") !== 0) {
    //  where = '#' + where;
    //}

    zasData.postTitle = $scope.maintitle;
    $location.path(where);
    $location.replace(where);
  }




$scope.replycount = [];

function getPosts(sectionid) {
//  console.log('getting threads in', sectionid, 'thread');
  $http.get('/api/posts/' + sectionid)
    .success(function (threadlist) {
      //console.log(threadlist);
      //$scope.threadinfo = threadlist[0].title[0];
      //console.log($scope.threadinfo);
      var decodedTitles = [];
      threadlist.title.forEach(function(title) {
        decodedTitles.push(decodeURI(title));
      });
      //$scope.threadtitles = threadlist.title;
      $scope.threadtitles = decodedTitles;
  //RENAME    //$scope.postids = threadlist.postids;

      threadlist.postids.forEach(function(id) {
        $scope.replycount.push(id.split(',').length);
      });


      $scope.threadids = threadlist.id;
      $scope.lastpost = threadlist.lastpost;
      $scope.author = threadlist.author;
      $scope.parentid = threadlist.parentid;
    //  console.log(threadlist);
      //console.log(threadlist[0].listing[0].title);
    }).error(function (data, status) {
      console.log('there was an error while getting threadlist.')
    })

}


  //console.log('routeparams: ' + $routeParams);
  //console.log('location.path(): ' + $location.path());
  if ($routeParams.tid) { //we have thread params, show a thread

    $http.get('/api/thread/' + $routeParams.tid)
      .success(function (result) {
      //  console.log(result);
        $scope.contentType = 3;
        $scope.postcount = result.postids.length || 0;
        $scope.response = result;

        $scope.posttitles = [];
        $scope.maintitle = decodeURI(result.threadtitle);
        result.titles.forEach(function (title) {
          $scope.posttitles.push(decodeURI(title));
        });
      //  console.log($scope.posttitles);
        ////$scope.parenttitle = result.parenttitle;
        $scope.postids = result.postids || null;
        result.contents.forEach(function (content,i) {
          $scope.pageContent.push($sce.trustAsHtml(decodeURI(result.contents[i])));
          //console.log(i + ' post');
        })
      })
      .error(function (data, status) {
      //  console.log(data.statusCode);
      //  console.log(data.error);
      //  console.log(data.message);
      });

    } else { // //if ($routeParams.sid)

      var section = 'none';
      if ($routeParams.sid) {
        section = $routeParams.sid;
      }
      $http.get('/api/section/' + section)
        .success(function (result) {
      //    console.log('section request:', result);
          $scope.sectitles = result.sectiontitle;
          $scope.sectypes = result.sectiontype;
          $scope.secparents = result.sectionparents;
          $scope.secids = result.sectionid;
          $scope.contentType = 1;
          $scope.postmarker = '';
          if (result.threadlist[0] === 'X') {
            getPosts(result.sectionid[0]);
            $scope.postmarker = 'X';
        //    console.log($scope.postmarker);
          }

          $scope.sublocation = [];
          $scope.sublast = -1;
          $scope.response = result;

          //annoying logic to determine where the subsections are in our
          //result. So we can properly display them with an inline style.
          result.sectiontype.forEach(function(sectiontype, z) {
            if (sectiontype === 'SubSection') {
              if (z > 0 && result.sectiontype[z-1] === 'Section') {
                $scope.sublocation[z] = 1;
                $scope.sublast = z;
              }
              if (z > 0 && result.sectiontype[z-1] === 'SubSection') {
                $scope.sublocation[$scope.sublast]++;
                $scope.sublocation[z] = 0;
              }
            }
            if (sectiontype !== 'SubSection') {
              $scope.sublast = -1;
              $scope.sublocation[z] = 0;
            }
          });
        })
        .error(function (data, status) {
        });
  }
}]);
