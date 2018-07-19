/* global define */
define([
  'jquery',
  'ramda',
  'pointfree',
  'Maybe',
  'player',
  'bacon',
  'io',
  'http'
], function($, _, P, Maybe, Player, bacon, io, http) {
  'use strict';
  io.extendFn();

  // HELPERS ///////////////////////////////////////////
  var compose = P.compose;
  var map = P.map;
  var getData = _.curry(function(name, elt) {
    return $(elt).data(name);
  });

  var log = function(x) {
    console.log(x);
    return x;
  };
  var fork = _.curry(function(err, succ, future) {
    return future.fork(err, succ);
  });
  var setHtml = _.curry(function(sel, x) {
    return $(sel).html(x);
  });

  var listen = _.curry(function(type, elt) {
    return bacon.fromEventTarget(elt, type);
  });

  //+ eventValue :: DomEvent -> String
  var eventValue = compose(
    _.get('value'),
    _.get('target')
  );

  //+ valueStream :: DomEvent -> EventStream String
  var valueStream = compose(
    map(eventValue),
    listen('keyup')
  );
  var last = function(ar) {
    console.log(ar[ar.length - 1]);
    return ar[ar.length - 1];
  };

  //+ termToUrl :: String -> URL
  var termToUrl = function(term) {
    return (
      'https://www.googleapis.com/youtube/v3/search?' +
      $.param({
        q: term,
        key: 'AIzaSyAUfjLYvxyiivwvksx7oRdMFCLa3PMHWqY',
        part: 'snippet'
      })
    );
  };

  //+ urlStream :: DomEvent -> EventStream String
  var urlStream = compose(
    map(termToUrl),
    valueStream
  );

  //+ getInputStream :: Selector -> IO EventStream String
  var getInputStream = compose(
    map(urlStream),
    $.toIO()
  );

  //+ render :: Entry -> Dom
  var render = function(e) {
    console.log(e);
    return $('<li/>', {
      text: e.snippet.title,
      'data-youtubeid': e.id.videoId
    });
  };

  //+ videoEntries :: YoutubeResponse -> [Dom]
  var videoEntries = compose(
    map(render),
    _.get('items')
  );

  //+ search :: URL -> Future [Dom]
  var search = compose(
    map(videoEntries),
    http.getJSON
  );

  //+ DomElement -> EventStream DomElement
  var clickStream = compose(
    map(_.get('target')),
    listen('click')
  );

  //+ URL -> String
  var idInUrl = compose(
    last,
    _.split('/')
  );

  //+ youtubeLink :: DomElement -> Maybe ID
  var youtubeId = compose(
    map(idInUrl),
    Maybe,
    getData('youtubeid')
  );

  // IMPURE /////////////////////////////////////////////////////

  getInputStream('#search')
    .runIO()
    .onValue(
      compose(
        fork(log, setHtml('#results')),
        search
      )
    );

  clickStream(document).onValue(
    compose(
      map(
        compose(
          setHtml('#player'),
          Player.create
        )
      ),
      youtubeId
    )
  );
});
