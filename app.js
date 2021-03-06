'use strict';
var fidgetStream = angular.module('fidgetStream', ['btford.socket-io','infinite-scroll']).
config(['socketProvider', function(socketProvider) {
    var socket = io.connect('http://localhost:5001');
        socketProvider.ioSocket(socket);
}]);

fidgetStream.factory('embeddingService', function(){
    return {
        name: '',
        status: '',
        loaded:false,
        objectData: '',
        flashVars: '',
        viewers: 0,
        set: function(stream){
            this.name =  stream.stream.display_name;
            this.status = stream.stream.status;
            this.loaded = true;
            this.objectData =  'http://www.twitch.tv/widgets/live_embed_player.swf?channel='+ this.name;
            this.flashVars = 'hostname=www.twitch.tv&channel=' + this.name + '&auto_play=true&start_volume=50';
            this.viewers =  stream.viewers;
        },
        getChannel: function(){
            return {
                name: this.name,
                status: this.status,
                objectData: this.objectData,
                viewers: this.viewers,
                flashVars: this.flashVars,
            };
        },
        getLoaded: function(){
            return this.loaded;
        }

    }
});


fidgetStream.controller('searchController', ['$scope', 'socket', function($scope, socket) {
    $scope.streams = [];
    $scope.query  = '';
    $scope.loading = false;
    $scope.success=false;

    $scope.search = function() {
        $scope.streams = [];
        socket.emit('twitch:search', { query: $scope.query });
    };

    $scope.play = function(){
        console.log("$scope.play: "+ $scope.name);
        socket.emit('twitch:play', {stream: $scope.name})
        $scope.success=false;
    };

    socket.on('twitch:search:success', function(searchResults) {
        $scope.loading = false;
        $scope.streams.push.apply($scope.streams, searchResults.streams);
        $scope.nextQuery = searchResults.streams.length > 0 ? searchResults._links.next : null;
        console.log('$scope.streams: '+$scope.streams.length);
        console.log('$scope.nextQuery: '+$scope.nextQuery);
        $scope.success=true;
    });

    $scope.loadNext = function() {
        if ($scope.nextQuery) {
            $scope.loading = true;
            socket.emit('twitch:search', { next: $scope.nextQuery });
        }
    }
}]);

fidgetStream.directive('twitchStream', ['socket',function(socket) {
    return {
        restrict: 'E',
        scope: {
            stream: '=stream'
        },
        templateUrl: '/js/templates/twitchStream.html',
        link: function(scope, element, attrs){
            element.bind('click', function(){
                socket.emit('twitch:play', {stream: scope.stream.channel, viewers: scope.stream.viewers});
            });
        }
    }
}]);

fidgetStream.controller('screenController', ['$scope','socket','embeddingService' , function($scope, socket, embeddingService){
    $scope.service = embeddingService;
    $scope.channel = {};
    $scope.loaded = false;
    var switched = false;

    socket.on('play-stream',function(stream){
        if($scope.channel.name != stream.stream.displayname)
        {
            switched = true;
        }
        $scope.$apply(function(){
            $scope.service.set(stream);
            $scope.loaded = $scope.service.getLoaded();
            $scope.channel = $scope.service.getChannel();
        });

        if(switched)
        {
            $scope.$broadcast('newStream', {"channel":$scope.channel,"channelChanged":true});
        }
    });

}]);

fidgetStream.directive('screen', ['embeddingService', '$route', function(embeddingService, $route){
    return {
        controller:'screenController',
        restrict:'E',
        scope:{
          channel: '=',
          loaded: '&'
        },
        replace: true,
        transclude: false,
        templateUrl: '/js/templates/screen.html',
        link: function(scope, element, attrs){
            scope.$on('newStream', function(event, stream){
                scope.$watch(function(channelChanged){
                    if(channelChanged)
                    {
                        var chat = document.getElementById("chat");
                        chat.innerHTML = ("<iframe frameborder='0' scrolling='no' id='chat_embed' src='http://twitch.tv/chat/embed?channel="+scope.channel.name+"&amp;popout_chat=true' height='500' width='350'></iframe>");
                        console.log("chat: "+chat.innerHTML);
                    }
                });
            });

        }
    };
}]);

fidgetStream.directive('player', [function(){
    return{
        restrict:'E',
        scope: true,
        templateUrl:'/js/templates/player.html'
    }
}]);


