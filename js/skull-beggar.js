var app = angular.module('skullBeggar', ['ngResource', 'ui.bootstrap']);

app.service('skullApi', 
['$resource', '$location', '$timeout', 
function($resource, $location, $timeout){
  var root = "http://localhost:3000";
  var channelTimeout = 2000;
  
  var api = {};
  
  var setOwner = function(){
    if(this.$scope.loaded){
      this.$scope.owner = 
        this.$scope.user.channel_id === this.$scope.channel.id;
    }  
  }.bind(api);
  
  var setChannelDataIntoScope = function(){
    this.$scope.loaded = loaded();
    this.$scope.streamUrl = 
      "http://www.twitch.tv/" + this.$scope.channel.name;
    this.$scope.streamerName = this.$scope.channel.display_name;
    setOwner();
  }.bind(api);
  
  // If the channel_id is in the search, load it into the scope
  var setChannelName = function(){
    var name = $location.search()["channel"];
    if(angular.isString(name)){
      this.$scope.channelName = name;
    } 
  }.bind(api);
  
  // Load the resource into the scope. If the page has
  // no channel_id search, try to redirect to the user's
  // channel. If the user has no channel, make it before
  // redirecting
  var loadUserPass = function(response){
    this.$scope.user = response;
    this.$scope.loaded = loaded();
    setOwner();
    
    if(!this.$scope.channelName){
      if(this.$scope.user.channel_id){
        loadUsersChannel();
      }
      else{
        createAndLoadUsersChannel();
      }
    }
  }.bind(api);
  
  var loadUserFail = function(response){
    this.Omniauth.authorize();
  }.bind(api);
  
  var loadChannelPass = function(response){
    console.log(response)
    this.$scope.channel = response;
    setChannelDataIntoScope();
    $timeout(loadChannel, channelTimeout);
  }.bind(api);
  
  var loadChannelFail = function(response){
    this.$scope.criticalError = true;
    $timeout(loadChannel, channelTimeout);
  }.bind(api);
  
  var createChannelPass = function(response){
    this.$scope.channel = response;
    setChannelDataIntoScope();
    $location.search("channel", response.name);
  }.bind(api);
  
  // If the load passes, just load resource into the scope,
  // otherwise it is a critical failure
  var loadChannel = function(){
    this.Channel.get({name: this.$scope.channelName}, 
      loadChannelPass, 
      loadChannelFail);
  }.bind(api);
  
  var loadUsersChannel = function(){
    $location.search("channel", this.$scope.user.name);
  }.bind(api);
  
  // If the creation works, redirect to that channel page, otherwise
  // it is a critical failure
  var createAndLoadUsersChannel = function(){
    this.Channel.create({}, createChannelPass, loadChannelFail);
  }.bind(api);
  
  // User callbacks will attempt to query the Twitch API if the user is
  // not found, and will create/redirect to the User's channel if there
  // is no channel_id in scope
  var loadUser = function(){
    this.User.get({}, loadUserPass, loadUserFail);
  }.bind(api);
  
  var loaded = function(){
    return angular.isDefined(this.$scope.user) 
      && angular.isDefined(this.$scope.channel);
  }.bind(api);
  
  api["Omniauth"] = {
    authorize: function(){
      window.location.href = root + "/users/auth/twitch";
    }
  };
  
  api["User"] = $resource(root + "/user/:id.json", {id: '@id'}, {
    'get': { method: 'GET', withCredentials: true }
  });
  
  api["Channel"] = $resource(root + "/channels/:id.json", {id: '@id'}, {
    'create': { method: 'POST', url: root + "/channels.json", withCredentials: true },
    'get': { method: 'GET', url: root + "/channels/:name.json", withCredentials: true },
    'setInactive': { method: 'POST', url: root + "/channels/:id/set_inactive.json", withCredentials: true },
    'openBetting': { method: 'POST', url: root + "/channels/:id/open_betting.json", withCredentials: true },
    'closeBetting': { method: 'POST', url: root + "/channels/:id/close_betting.json", withCredentials: true },
    'completeBetting': { method: 'POST', url: root + "/channels/:id/complete_betting.json", withCredentials: true }
  });
  
  api["ChannelAccount"] = $resource(root + "/channel_accounts/:id.json", {id: '@id'},{
    'get': { method: 'GET' },
    'rest': { method: 'POST', url: root + "/channel_accounts/:id/rest.json", withCredentials: true },
    'donateBlood': { method: 'POST', url: root + "/channel_accounts/:id/donate_blood.json", withCredentials: true },
    'bet': { method: 'POST', url: root + "/channel_accounts/:id/bet.json", withCredentials: true }
  });
  
  // Does all the initial backend queries
  api["initialize"] = function($scope){
    this.$scope = $scope;
    
    setChannelName();
    if($scope.channelName){ loadChannel(); }
    loadUser();
  };
  
  return api;
}]);

app.service('skullHelpers', 
['skullApi',
function(skullApi){
  var $scope;
  
  var channelExistsAndStatus = function(status){
    return $scope.loaded && 
      $scope.channel.status === status;
  };
  
  var inactive = function(){
    return channelExistsAndStatus("inactive");
  };
  
  var betting = function(){
    return channelExistsAndStatus("betting_open");
  };
  
  var inactiveChannelAccount = function(){
    return $scope.loaded && $scope.channel.channel_account.status === "inactive"
  };
  
  var activeChannelAccount = function(){
    return $scope.loaded && $scope.channel.channel_account.status !== "inactive"
  };
  
  var waiting = function(){
    return channelExistsAndStatus("betting_closed");
  };
  
  var acted = function(){
    return $scope.channel.channel_account.status !== "inactive";
  };
  
  var healthy = function(){
    return $scope.channel.channel_account.health > 1;
  };
  
  var maxHealthy = function(){
    return $scope.channel.channel_account.health ===
      $scope.channel.channel_account.max_health;
  };
  
  var placeholderText = function(){
    return betting()
      ?  "Search by name..." 
      : "Betting disabled...";
  };
  
  var cash = function(){
    return $scope.loaded && 
      $scope.channel.channel_account.balance;
  };
  
  var health = function(){
    return $scope.loaded && 
      $scope.channel.channel_account.health;
  };
  
  var maxHealth = function(){
    return $scope.loaded && 
      $scope.channel.channel_account.max_health;
  };
  
  var rootUrl = function(){
    return "localhost:4000";
  };
  
  var streamUrl = function(){
    if($scope.user){
      return "www.twitch.tv/" + $scope.user.name;
    }  
  };
  
  var openBetting = function(){
    skullApi.Channel.openBetting({
      id: $scope.channel.id
    }, function(response){
      $scope.channel = response;
    }, function(response){
      console.log("TO DO: handle open betting failure")
    })
  };
  
  var closeBetting = function(){
    skullApi.Channel.closeBetting({
      id: $scope.channel.id
    }, function(response){
      $scope.channel = response;
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var completeBetting = function(){
    skullApi.Channel.completeBetting({
      id: $scope.channel.id,
      enemy_id: $scope.selected.enemy.id
    }, function(response){
      $scope.channel = response;
      $scope.selected.enemy = null;
      $scope.selected.index = null;
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var invalidateBetting = function(){
    skullApi.Channel.setInactive({
      id: $scope.channel.id
    }, function(response){
      $scope.channel = response;
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var rest = function(){
    skullApi.ChannelAccount.rest({
      id: $scope.channel.channel_account.id
    }, function(response){
      $scope.channel.channel_account = response;
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var donateBlood = function(){
    skullApi.ChannelAccount.donateBlood({
      id: $scope.channel.channel_account.id
    }, function(response){
      $scope.channel.channel_account = response;
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var bet = function(enemy_id, amount, success, failure){
    skullApi.ChannelAccount.bet({
      id: $scope.channel.channel_account.id,
      enemy_id: enemy_id,
      amount: amount
    }, function(response){
      $scope.channel.channel_account = response;
      success();
    }, function(response){
      console.log("TO DO: handle close betting failure")
    })
  };
  
  var initializer = {
    initialize: function(scope){
      $scope = scope;
      
      $scope.inactive = inactive;
      $scope.betting = betting
      $scope.waiting = waiting;
      $scope.inactiveChannelAccount = inactiveChannelAccount;
      $scope.activeChannelAccount = activeChannelAccount;
      $scope.acted = acted;
      $scope.healthy = healthy;
      $scope.maxHealthy = maxHealthy;
      
      $scope.placeholderText = placeholderText;
      $scope.cash = cash;
      $scope.health = health;
      $scope.maxHealth = maxHealth;
      
      $scope.openBetting = openBetting;
      $scope.closeBetting = closeBetting;
      $scope.completeBetting = completeBetting;
      $scope.invalidateBetting = invalidateBetting;
      
      $scope.rest = rest;
      $scope.donateBlood = donateBlood;
      $scope.bet = bet;
      
      $scope.rootUrl = "localhost:4000";
      $scope.streamUrl = "";
    }
  };
  
  return initializer;
}]);

app.service('enemies', [
function(){
  return [
    { id: 0, name: "Test 0", imgUrl: "/images/Dime2.png" },
    { id: 1, name: "Test 1", imgUrl: "/images/Dime2.png" },
    { id: 2, name: "Test 2", imgUrl: "/images/Dime2.png" },
    { id: 3, name: "Test 3", imgUrl: "/images/Dime2.png" },
    { id: 4, name: "Test 4", imgUrl: "/images/Dime2.png" },
    { id: 5, name: "Test 5", imgUrl: "/images/Dime2.png" },
    { id: 6, name: "Test 6", imgUrl: "/images/Dime2.png" },
    { id: 7, name: "Test 7", imgUrl: "/images/Dime2.png" },
    { id: 8, name: "Test 8", imgUrl: "/images/Dime2.png" },
    { id: 9, name: "Test 9", imgUrl: "/images/Dime2.png" },
    { id: 10, name: "Test 10", imgUrl: "/images/Dime2.png" },
    { id: 11, name: "Test 11", imgUrl: "/images/Dime2.png" },
    { id: 12, name: "Test 12", imgUrl: "/images/Dime2.png" },
    { id: 13, name: "Test 13", imgUrl: "/images/Dime2.png" },
    { id: 14, name: "Test 14", imgUrl: "/images/Dime2.png" },
    { id: 15, name: "Test 15", imgUrl: "/images/Dime2.png" },
    { id: 16, name: "Test 16", imgUrl: "/images/Dime2.png" },
    { id: 17, name: "Test 17", imgUrl: "/images/Dime2.png" },
    { id: 18, name: "Test 18", imgUrl: "/images/Dime2.png" },
    { id: 19, name: "Test 19", imgUrl: "/images/Dime2.png" }
  ]
}]);

app.directive('logoPanel', function(){
  return{
    restrict: 'E',
    templateUrl: 'templates/logo-panel.html'
  };
});

app.directive('activityPanel', function(){
  return{
    restrict: 'E',
    templateUrl: 'templates/activity-panel.html'
  };
});

app.directive('bettingPanel', function(){
  return{
    restrict: 'E',
    scope: {
      enemies: "=",
      fun: "=",
      selected: '=?'
    },
    templateUrl: 'templates/betting-panel.html',
    link: function(scope){
      if(!scope.selected){
        scope.selected = {};
      }
      console.log(scope.selected)
    }
  };
});

app.directive('inactivePanel', function(){
  return{
    restrict: 'E',
    templateUrl: 'templates/inactive-panel.html'
  };
});

app.directive('waitingPanel', function(){
  return{
    restrict: 'E',
    templateUrl: 'templates/waiting-panel.html'
  };
});

app.controller('betModalController', 
['$scope', '$modalInstance', 'enemy',
function($scope, $modalInstance, enemy){
  $scope.enemy = enemy;
  $scope.betObj = { amount: 0 };
  
  $scope.save = function(){
    $scope.bet(enemy.id, $scope.betObj.amount, 
      function(){
        $modalInstance.dismiss('saved');
      }, function(){
        console.log("Todo: handle modal failure")
      });
  };
  
  $scope.cancel = function(){
    $modalInstance.dismiss('closed');
  };
}]);

app.controller('skullController', 
[ '$scope', '$modal', 'skullApi', 'skullHelpers', 'enemies',  
function($scope, $modal, skullApi, skullHelpers, enemies){
  skullApi.initialize($scope);
  skullHelpers.initialize($scope);
  
  $scope.enemies = enemies;
  $scope.search = { text: "" };
  $scope.selected = { enemy: null, index: null };
  
  $scope.betOn = function(enemy, index){
    $modal.open({
      templateUrl: 'templates/betting-modal.html',
      controller: 'betModalController',
      scope: $scope, 
      resolve:{
        enemy: function(){
          return enemy;
        }
      }
    });
  };
  
  $scope.setLoser = function(enemy, index){
    $scope.selected.enemy = enemy;
    $scope.selected.index = index;
  };
}]);