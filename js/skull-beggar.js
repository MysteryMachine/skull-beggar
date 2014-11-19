var app = angular.module('skullBeggar', ['ngResource', 'ui.bootstrap']);

app.service('skullApi', 
['$resource', '$location', '$timeout', '$window',
function($resource, $location, $timeout, $window){
  var root = "http://mystery-works.herokuapp.com";
    //"http://localhost:3000";
  var channelTimeout = 2000;
  
  var api = {};
  
  var setOwner = function(){
    this.$scope.owner = this.$scope.user.name === this.$scope.channelName;
  }.bind(api);
  
  var setChannelDataIntoScope = function(){
    this.$scope.streamUrl = 
      "http://www.twitch.tv/" + this.$scope.channel.name;
    this.$scope.streamerName = this.$scope.channel.display_name;
  }.bind(api);
  
  // If the channel_id is in the search, load it into the scope
  var setChannelName = function(){
    var name = $location.search()["channel"];
    if(angular.isString(name)){
      this.$scope.channelName = name;
    }
    else{
      $location.search("channel", this.$scope.user.name);
      this.$scope.channelName = this.$scope.user.name;
    }
  }.bind(api);
  
  // Load the resource into the scope. If the page has
  // no channel_id search, try to redirect to the user's
  // channel. If the user has no channel, make it before
  // redirecting
  var loadUserPass = function(response){
    this.$scope.user = response;
    
    setChannelName();
    setOwner();
    
    if(this.$scope.owner && !this.$scope.user.channel_id){
      createAndLoadUsersChannel();
    }
    else{
      loadChannel();
    }
  }.bind(api);
  
  var loadUserFail = function(response){
    this.Omniauth.authorize();
  }.bind(api);
  
  var loadChannelPass = function(response){
    this.$scope.loaded = loaded();
    this.$scope.channel = response;
    setChannelDataIntoScope();
    $timeout(loadChannel, channelTimeout);
  }.bind(api);
  
  var loadChannelFail = function(response){
    if(this.$scope.owner){
      createAndLoadUsersChannel();
    }
    else{
      $timeout(loadChannel, channelTimeout);
    }
  }.bind(api);
  
  var createChannelPass = function(response){
    this.$scope.channel = response;
    setChannelDataIntoScope();
    $timeout(loadChannel, channelTimeout);
  }.bind(api);
  
  // If the load passes, just load resource into the scope,
  // otherwise it is a critical failure
  var loadChannel = function(){
    this.Channel.get({name: this.$scope.channelName}, 
      loadChannelPass, 
      loadChannelFail);
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
      var origStr = "";
      if($location.search()["channel"]){
        origStr = $location.search()["channel"];
      }
      $window.location = root + "/users/auth/twitch?origin=" + origStr;
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
      
      $scope.rootUrl =  "http://mysterymachine.github.io/skull-beggar"
        //"localhost:4000";
      $scope.streamUrl = "";
    }
  };
  
  return initializer;
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
      selected: '=?',
      search: '='
    },
    templateUrl: 'templates/betting-panel.html',
    link: function(scope){
      if(!scope.selected){
        scope.selected = {};
      }
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

app.directive('helpPanel', function(){
  return{
    restrict: 'E',
    templateUrl: 'templates/help.html',
    scope:{
      betting: "="
    }
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

app.service('enemies', [
function(){
  return [
    { meta: "boss", id: 544, name: "Gurglings", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 545, name: "Dingle", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 546, name: "The Haunt", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 547, name: "Mega Maw", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 548, name: "Mega Fatty", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 549, name: "The Gate", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 550, name: "Mama Gurdy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 551, name: "The Cage", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 552, name: "The Haunt", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 553, name: "Dark One", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 554, name: "Polycephalus", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 555, name: "The Adversary", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 556, name: "Mama Gurdy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 557, name: "Mr. Fred", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 558, name: "The Lamb", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 559, name: "Mega Satan", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 552, name: "The Duke of Flies", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 501, name: "Gemini", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 502, name: "Monstro", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 503, name: "Larry Jr.", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 504, name: "Famine", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 505, name: "Steven", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 506, name: "Widow", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 507, name: "Pin", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 508, name: "Blighted Ovum", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 509, name: "Gurdy Jr.", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 510, name: "Fistula", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 511, name: "Gurdy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 512, name: "Peep", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 513, name: "Chub", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 514, name: "Pestilence", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 515, name: "C.H.A.D.", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 516, name: "The Carrion Queen", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 517, name: "The Husk", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 518, name: "The Hollow", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 519, name: "The Wretched", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 521, name: "Peep", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 522, name: "Monstro II", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 523, name: "Loki", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 524, name: "War", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 525, name: "Gish", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 526, name: "Mom", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 527, name: "Mask of Infamy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 528, name: "Daddy Long Legs", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 529, name: "Triachnid", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 520, name: "The Bloat", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 530, name: "Scolex", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 531, name: "Blastocyst", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 532, name: "Death", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 533, name: "Conquest", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 534, name: "Mom's Heart", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 535, name: "It Lives", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 536, name: "Teratoma", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 537, name: "Lokii", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 538, name: "Satan", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 539, name: "Isaac", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 540, name: "???", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 541, name: "The Fallen", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 542, name: "Headless Horseman", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 543, name: "Krampus", imgUrl: "images/Penny.png" },
    
    { meta: "floor", id: 1, name: "Basement/Cellar 1", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 2, name: "Basement/Cellar 2", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 3, name: "Caves/Catacombs 1", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 4, name: "Caves/Catacombs 2", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 5, name: "Depths/Necro 1", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 6, name: "Depths/Necro 2", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 7, name: "Womb/Utero 1", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 8, name: "Womb/Utero 1", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 9, name: "Sheol", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 10, name: "Cathedral", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 11, name: "Chest", imgUrl: "images/Penny.png"},
    { meta: "floor", id: 12, name: "Dark Room", imgUrl: "images/Penny.png"},
    
    { meta: "boss", id: 600, name: "Envy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 601, name: "Super Envy", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 602, name: "Gluttony", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 603, name: "Super Gluttony", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 604, name: "Greed", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 605, name: "Super Greed", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 606, name: "Lust", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 607, name: "Super Lust", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 608, name: "Pride", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 609, name: "Super Pride", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 610, name: "Ultra Pride", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 611, name: "Sloth", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 612, name: "Super Sloth", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 613, name: "Wrath", imgUrl: "images/Penny.png" },
    { meta: "boss", id: 614, name: "Super Wrath", imgUrl: "images/Penny.png" },
    
    { meta: "suicide", id: 900, name: "Suicide", imgUrl: "images/Penny.png" },
    { meta: "win", id: 925, name: "Win", imgUrl: "images/Penny.png" }
  ]
}]);