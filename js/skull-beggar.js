var app = angular.module('skullBeggar', ['ngResource', 'ui.bootstrap']);

app.service('skullApi', 
['$resource', '$location', '$timeout', '$window',
function($resource, $location, $timeout, $window){
  var root = "mystery-works.herokuapp.com";
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
    this.$scope.channelName = this.$scope.user.name;
    loadChannel();
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
      $window.location.href = root + "/users/auth/twitch";
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
      
      $scope.rootUrl = "http://mysterymachine.github.io/skull-beggar";
      $scope.streamUrl = "";
    }
  };
  
  return initializer;
}]);

app.service('enemies', [
function(){
  return [
    { id: 0, name: "Black Fly", imgUrl: "images/Penny.png" },
    { id: 1, name: "Attack Fly", imgUrl: "images/Penny.png" },
    { id: 2, name: "Moter", imgUrl: "images/Penny.png" },
    { id: 3, name: "Pooter", imgUrl: "images/Penny.png" },
    { id: 4, name: "Fat Fly", imgUrl: "images/Penny.png" },
    { id: 5, name: "Spider", imgUrl: "images/Penny.png" },
    { id: 6, name: "Big Spider", imgUrl: "images/Penny.png" },
    { id: 7, name: "Trite", imgUrl: "images/Penny.png" },
    { id: 8, name: "Mulligan", imgUrl: "images/Penny.png" },
    { id: 9, name: "Mulligoon", imgUrl: "images/Penny.png" },
    { id: 10, name: "Mulliboon", imgUrl: "images/Penny.png" },
    { id: 11, name: "Hive", imgUrl: "images/Penny.png" },
    { id: 12, name: "Hopper", imgUrl: "images/Penny.png" },
    { id: 21, name: "Flaming Hopper", imgUrl: "images/Penny.png" },
    { id: 13, name: "Pacer", imgUrl: "images/Penny.png" },
    { id: 14, name: "Gusher", imgUrl: "images/Penny.png" },
    { id: 15, name: "Gaper", imgUrl: "images/Penny.png" },
    { id: 16, name: "Frowning Gaper", imgUrl: "images/Penny.png" },
    { id: 17, name: "Horf", imgUrl: "images/Penny.png" },
    { id: 18, name: "Clotty", imgUrl: "images/Penny.png" },
    { id: 19, name: "Clot", imgUrl: "images/Penny.png" },
    { id: 20, name: "I. Blob", imgUrl: "images/Penny.png" },
    { id: 21, name: "Embryo", imgUrl: "images/Penny.png" },
    
    { id: 101, name: "Boom Fly", imgUrl: "images/Penny.png" },
    { id: 102, name: "Red Boom Fly", imgUrl: "images/Penny.png" },
    { id: 103, name: "Sucker", imgUrl: "images/Penny.png" },
    { id: 104, name: "Spit", imgUrl: "images/Penny.png" },
    { id: 105, name: "Boil", imgUrl: "images/Penny.png" },
    { id: 106, name: "Gut", imgUrl: "images/Penny.png" },
    { id: 107, name: "Sack", imgUrl: "images/Penny.png" },
    { id: 108, name: "Walking Boil", imgUrl: "images/Penny.png" },
    { id: 109, name: "Walking Gut", imgUrl: "images/Penny.png" },
    { id: 110, name: "Walking Sack", imgUrl: "images/Penny.png" },
    { id: 111, name: "Swarmer", imgUrl: "images/Penny.png" },
    { id: 112, name: "Gurgle", imgUrl: "images/Penny.png" },
    { id: 113, name: "Mr. Maw", imgUrl: "images/Penny.png" },
    { id: 114, name: "Maw", imgUrl: "images/Penny.png" },
    { id: 115, name: "Red Maw", imgUrl: "images/Penny.png" },
    { id: 116, name: "Psychic Maw", imgUrl: "images/Penny.png" },
    { id: 117, name: "Globin", imgUrl: "images/Penny.png" },
    { id: 118, name: "Gazing Globin", imgUrl: "images/Penny.png" },
    { id: 119, name: "Maggot", imgUrl: "images/Penny.png" },
    { id: 120, name: "Charger", imgUrl: "images/Penny.png" },
    { id: 121, name: "Spitty", imgUrl: "images/Penny.png" },
    { id: 122, name: "Host", imgUrl: "images/Penny.png" },
    { id: 123, name: "Red Host", imgUrl: "images/Penny.png" },
    { id: 124, name: "Leech", imgUrl: "images/Penny.png" },
    { id: 125, name: "Vis", imgUrl: "images/Penny.png" },
    { id: 126, name: "Double Vis", imgUrl: "images/Penny.png" },
    { id: 127, name: "Chubber", imgUrl: "images/Penny.png" },
    { id: 128, name: "Porky", imgUrl: "images/Penny.png" },
    { id: 129, name: "Slide", imgUrl: "images/Penny.png" },
    { id: 131, name: "Keeper", imgUrl: "images/Penny.png" },
    { id: 132, name: "Hanger", imgUrl: "images/Penny.png" },
    { id: 133, name: "Stone Grimace", imgUrl: "images/Penny.png" },
    { id: 134, name: "Vomit Grimace", imgUrl: "images/Penny.png" },
    { id: 135, name: "B. Licker", imgUrl: "images/Penny.png" },
    
    { id: 201, name: "Leaper", imgUrl: "images/Penny.png" },
    { id: 202, name: "Knight", imgUrl: "images/Penny.png" },
    { id: 203, name: "Selfless Knight", imgUrl: "images/Penny.png" },
    { id: 204, name: "Brain", imgUrl: "images/Penny.png" },
    { id: 205, name: "Guts", imgUrl: "images/Penny.png" },
    { id: 206, name: "Baby", imgUrl: "images/Penny.png" },
    
    { id: 300, name: "Mask", imgUrl: "images/Penny.png" },
    { id: 301, name: "Heart", imgUrl: "images/Penny.png" },
    { id: 302, name: "MemBrain", imgUrl: "images/Penny.png" },
    { id: 303, name: "Mama Guts", imgUrl: "images/Penny.png" },
    { id: 304, name: "Para-Bite", imgUrl: "images/Penny.png" },
    { id: 305, name: "Fred", imgUrl: "images/Penny.png" },
    { id: 306, name: "Lump", imgUrl: "images/Penny.png" },
    { id: 307, name: "Eye", imgUrl: "images/Penny.png" },
    { id: 308, name: "Bloodshot Eye", imgUrl: "images/Penny.png" },
    { id: 309, name: "Dople", imgUrl: "images/Penny.png" },
    { id: 310, name: "Evil Twin", imgUrl: "images/Penny.png" },
    
    { id: 400, name: "Eternal Fly", imgUrl: "images/Penny.png" },
    { id: 401, name: "Holy Leech", imgUrl: "images/Penny.png" },
    { id: 402, name: "Angelic Baby", imgUrl: "images/Penny.png" },
    { id: 403, name: "Hanger", imgUrl: "images/Penny.png" },
    { id: 450, name: "Kamikaze Leech", imgUrl: "images/Penny.png" },
    
    { id: 500, name: "The Duke of Flies", imgUrl: "images/Penny.png" },
    { id: 501, name: "Gemini", imgUrl: "images/Penny.png" },
    { id: 502, name: "Monstro", imgUrl: "images/Penny.png" },
    { id: 503, name: "Larry Jr.", imgUrl: "images/Penny.png" },
    { id: 504, name: "Famine", imgUrl: "images/Penny.png" },
    { id: 505, name: "Steven", imgUrl: "images/Penny.png" },
    { id: 506, name: "Widow", imgUrl: "images/Penny.png" },
    { id: 507, name: "Pin", imgUrl: "images/Penny.png" },
    { id: 508, name: "Blighted Ovum", imgUrl: "images/Penny.png" },
    { id: 509, name: "Gurdy Jr.", imgUrl: "images/Penny.png" },
    { id: 510, name: "Fistula", imgUrl: "images/Penny.png" },
    { id: 511, name: "Gurdy", imgUrl: "images/Penny.png" },
    { id: 512, name: "Peep", imgUrl: "images/Penny.png" },
    { id: 513, name: "Chub", imgUrl: "images/Penny.png" },
    { id: 514, name: "Pestilence", imgUrl: "images/Penny.png" },
    { id: 515, name: "C.H.A.D.", imgUrl: "images/Penny.png" },
    { id: 516, name: "The Carrion Queen", imgUrl: "images/Penny.png" },
    { id: 517, name: "The Husk", imgUrl: "images/Penny.png" },
    { id: 518, name: "The Hollow", imgUrl: "images/Penny.png" },
    { id: 519, name: "The Wretched", imgUrl: "images/Penny.png" },
    { id: 521, name: "Peep", imgUrl: "images/Penny.png" },
    { id: 522, name: "Monstro II", imgUrl: "images/Penny.png" },
    { id: 523, name: "Loki", imgUrl: "images/Penny.png" },
    { id: 524, name: "War", imgUrl: "images/Penny.png" },
    { id: 525, name: "Gish", imgUrl: "images/Penny.png" },
    { id: 526, name: "Mom", imgUrl: "images/Penny.png" },
    { id: 527, name: "Mask of Infamy", imgUrl: "images/Penny.png" },
    { id: 528, name: "Daddy Long Legs", imgUrl: "images/Penny.png" },
    { id: 529, name: "Triachnid", imgUrl: "images/Penny.png" },
    { id: 520, name: "The Bloat", imgUrl: "images/Penny.png" },
    { id: 530, name: "Scolex", imgUrl: "images/Penny.png" },
    { id: 531, name: "Blastocyst", imgUrl: "images/Penny.png" },
    { id: 532, name: "Death", imgUrl: "images/Penny.png" },
    { id: 533, name: "Conquest", imgUrl: "images/Penny.png" },
    { id: 534, name: "Mom's Heart", imgUrl: "images/Penny.png" },
    { id: 535, name: "It Lives", imgUrl: "images/Penny.png" },
    { id: 536, name: "Teratoma", imgUrl: "images/Penny.png" },
    { id: 537, name: "Lokii", imgUrl: "images/Penny.png" },
    { id: 538, name: "Satan", imgUrl: "images/Penny.png" },
    { id: 539, name: "Isaac", imgUrl: "images/Penny.png" },
    { id: 540, name: "???", imgUrl: "images/Penny.png" },
    { id: 541, name: "The Fallen", imgUrl: "images/Penny.png" },
    { id: 542, name: "Headless Horseman", imgUrl: "images/Penny.png" },
    { id: 543, name: "Krampus", imgUrl: "images/Penny.png" },
    
    { id: 600, name: "Envy", imgUrl: "images/Penny.png" },
    { id: 601, name: "Super Envy", imgUrl: "images/Penny.png" },
    { id: 602, name: "Gluttony", imgUrl: "images/Penny.png" },
    { id: 603, name: "Super Gluttony", imgUrl: "images/Penny.png" },
    { id: 604, name: "Greed", imgUrl: "images/Penny.png" },
    { id: 605, name: "Super Greed", imgUrl: "images/Penny.png" },
    { id: 606, name: "Lust", imgUrl: "images/Penny.png" },
    { id: 607, name: "Super Lust", imgUrl: "images/Penny.png" },
    { id: 608, name: "Pride", imgUrl: "images/Penny.png" },
    { id: 609, name: "Super Pride", imgUrl: "images/Penny.png" },
    { id: 610, name: "Ultra Pride", imgUrl: "images/Penny.png" },
    { id: 611, name: "Sloth", imgUrl: "images/Penny.png" },
    { id: 612, name: "Super Sloth", imgUrl: "images/Penny.png" },
    { id: 613, name: "Wrath", imgUrl: "images/Penny.png" },
    { id: 614, name: "Super Wrath", imgUrl: "images/Penny.png" },
    
    { id: 900, name: "Blood Machine", imgUrl: "images/Penny.png" },
    { id: 901, name: "Demon Beggar", imgUrl: "images/Penny.png" },
    { id: 902, name: "Satan Deal", imgUrl: "images/Penny.png" },
    { id: 903, name: "Troll Bomb", imgUrl: "images/Penny.png" },
    { id: 904, name: "Super Troll Bomb", imgUrl: "images/Penny.png" },
    { id: 905, name: "IPECAC", imgUrl: "images/Penny.png" },
    { id: 906, name: "Bomb", imgUrl: "images/Penny.png" },
    { id: 907, name: "Dr. Fetus", imgUrl: "images/Penny.png" },
    { id: 908, name: "Epic Fetus", imgUrl: "images/Penny.png" },
    { id: 909, name: "Anarchist Cookbook", imgUrl: "images/Penny.png" },
    { id: 910, name: "Bob's Rotten Head", imgUrl: "images/Penny.png" },
    { id: 911, name: "Doctor's Remote", imgUrl: "images/Penny.png" },
    { id: 912, name: "Kamikaze", imgUrl: "images/Penny.png" },
    { id: 913, name: "Mr. Boom", imgUrl: "images/Penny.png" },
    { id: 914, name: "Razor Blade", imgUrl: "images/Penny.png" },
    { id: 915, name: "Best Friend", imgUrl: "images/Penny.png" },
    { id: 916, name: "Blood Rights", imgUrl: "images/Penny.png" },
    { id: 917, name: "IV Bag", imgUrl: "images/Penny.png" },
    { id: 918, name: "Remote Detonator", imgUrl: "images/Penny.png" },
    { id: 919, name: "Fire", imgUrl: "images/Penny.png" },
    { id: 920, name: "Red Fire", imgUrl: "images/Penny.png" },
    { id: 921, name: "Spikes", imgUrl: "images/Penny.png" },
    { id: 922, name: "Curse Room Door", imgUrl: "images/Penny.png" },
    { id: 923, name: "New Enemy", imgUrl: "images/Penny.png" },
    { id: 924, name: "New Boss", imgUrl: "images/Penny.png" },
    { id: 925, name: "Other", imgUrl: "images/Penny.png" }
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