// ==UserScript==
// @name          where on earth
// @namespace     http://www.bluebeckie.com/
// @description   show the locations related with the article
// @include       http://*news.yahoo.com/*
// @include       http://*omg.yahoo.com/*
// @include       http://*sports.yahoo.com/*
// @require       http://code.jquery.com/jquery-1.7.2.min.js
// @version       1.0
// @copyright  2012+, beckie
// ==/UserScript==

$(function(){
var latlon = [40.755970, -73.986702];
var map;
var places = [], uplaces={}, aplaces=[], tplaces=[];
var markermap = {};

    var article_node = $('.yom-art-content');
    if (!article_node) { return; }
    
    var button = $(document.createElement('input'))
        .attr({
            'type':'button',
            'value':' show on map '
        }).css({
            'font-weight':'bold',
            'padding':'5px'
        });

    article_node.prepend(button);

    //button.click(function(e){ parseData(); });
    button.click(function(e){ callCAP(); });

    function callCAP() {
     
        if ($('#woe-overlay').length > 0) {
            $('#woe-overlay').show();
            return;
        }

        var url = window.location.href.split('.html')[0],
            query = encodeURIComponent('select * from contentanalysis.analyze where url="' + url + '.html"');

        $.ajax({
            url: 'http://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json',
            complete: function(xhr, status) {
                if (status === 'error' || !xhr.responseText) {
                    handleError();
                }
                else {
                    var data = xhr.responseText;
                    parseData(data);
                }
            }
        });

    };

    function parseData(data) {
       
        if ($('#woe-overlay').length > 0 ) {
            $('#woe-overlay').show();
            return;
        }
        data = $.parseJSON(data);

        if (data.query.count !== 0) {

            data = data.query.results.entities.entity;
            //console.log(data);
            for (var i=0,j=data.length;i<j;i++) {
                var item = data[i],
                    text = item.text.content,
                    datatype = item.types;
               
                if (typeof datatype === 'undefined') {
                    continue;
                }
               
                datatype = datatype.type;
                datatype = (typeof datatype.length !=='undefined') ? datatype[0].content : datatype.content;
   
                if (datatype.indexOf('place')> -1) {
                    var obj = {
                        text : text,
                        lat : null,
                        lon : null
                    }
                    places.push(obj);
                }
            };
           
            //console.log(places);
           
            //dedupe
            for (var i=0,j=places.length; i<j ; i++) {
                if (typeof uplaces[places[i].text] === 'undefined') {
                    uplaces[places[i].text] = places[i];
                    tplaces.push('"' + places[i].text + '"');    
                    aplaces.push(places[i]);
                }
            }
           
            // fetch location data
            //select latitude, longitude from geo.placefinder where text in ("sfo","New York")
            var geoquery = encodeURIComponent('select latitude, longitude from geo.placefinder where text in (' + tplaces.join(',') + ')');
            $.ajax({
                url: 'http://query.yahooapis.com/v1/public/yql?format=json&q=' + geoquery,
				type: 'POST',
                complete: function(xhr, status) {
                    if (status === 'error' || !xhr.responseText) {
                        handleError();
                    }
                    else {
                        var data = xhr.responseText;
                        parseGeo(data);
                    }
                }
            });
        } else {
            createLayer();
        }
       
    };
   
    function parseGeo(data) {
        //console.log(data);
        data = $.parseJSON(data);
        data = data.query.results.Result;
        
        if (typeof data.length !== 'undefined') {
            
            for (var i=0,j=data.length;i<j;i++) {
                aplaces[i].lat = data[i].latitude;
                aplaces[i].lon = data[i].longitude;
            }
            
        } else {
            aplaces[0].lat = data.latitude;
            aplaces[0].lon = data.longitude;
        }
        
        //console.log(aplaces);
        createLayer();
    }
   
    unsafeWindow.parseData = parseData;
    unsafeWindow.parseGeo = parseGeo;

    function createLayer() {
      
        var nWidth = $(window).width()-100,
            nHeight = $(window).height()-100,
            nTop = $(window).scrollTop()+50;
     
        var overlay = $(document.createElement('div')).attr({'id':'woe-overlay'}).css({
            'background':'rgba(200,200,200,0.8)',
            'border-radius':'10px',
            'width':nWidth+'px',
            'height':nHeight+'px',
            'overflow':'auto',
            'position':'absolute',
            'left':'50px',
            'top': nTop + 'px',
            'padding':'10px',
            'z-index':'10000800'
        });
  
        var mapBox = $(document.createElement('div')).attr({'id':'woe-map-box'}).css('height','500px');
       
        overlay.append(mapBox);
        $('body').append(overlay);
    
        //bind events
        $(window).scroll( function() {
            overlay.css('top', ($(window).scrollTop()+50)+'px');
        });

        loadScript();
    };

    function loadScript() {
        var script = $(document.createElement('script')).attr({
           'type':'text/javascript',
           'src':'http://maps.googleapis.com/maps/api/js?v=3&key=AIzaSyD2ITHbp6WMOKY1ltxcSk9IthD_FgPLik8&sensor=false&callback=loadMap'
        });
        $('body').append(script);
    }

    function loadMap() {

        if (navigator.geolocation) {

            navigator.geolocation.getCurrentPosition( function(pos) {
                //console.log(pos.coords);
                latlon = [pos.coords.latitude, pos.coords.longitude];
              
                renderMap(latlon);
            });

        } else {
            renderMap(latlon);
        }
        //console.log(latlon);
    }

    unsafeWindow.loadMap = loadMap;
    
    function renderMap(latlon) {
    
        var google = unsafeWindow.google;
    
        var myOptions = {
        zoom: 15,
        center: new google.maps.LatLng(latlon[0], latlon[1]),
        mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById('woe-map-box'), myOptions);

        setupMarker();
    };

    function setupMarker() {
        // close button
        var btn = $(document.createElement('span')).attr({'id':'woe-close'}).css({
            'background':'white',
            'border':'1px solid red',
            'border-radius':'5px',
            'color':'red',
            'cursor':'pointer',
            'float':'right',
            'font-size':'160%',
            'font-weight':'bold',
            'margin':'5px',
            'padding':'0 8px',
            'position':'relative'
        }).text('x');

        // location list
        var list = $(document.createElement('ul')).attr({'id':'woe-list'}).css({
            'background':'#fff',       
            'list-style-type':'disc',
            'padding':'5px'
        });

        //map params
        var google = unsafeWindow.google;
        var bounds = new google.maps.LatLngBounds();

        //self
        var myLatLng = new google.maps.LatLng(latlon[0],latlon[1]);
        var marker = new google.maps.Marker({
              position: myLatLng,
              map: map,
              title: "You Are Here"
        });
       
        var content = '<em>You Are Here</em>';
        var infoWindow = new google.maps.InfoWindow({
            content: content
        });
       
        bounds.extend(myLatLng);
        map.fitBounds(bounds);

        markermap['list0'] = {'marker': marker, 'content': content } ;
        google.maps.event.addListener(markermap['list0'].marker, 'click', function(event) {
            infoWindow.setContent(markermap['list0'].content);
            infoWindow.open(map, markermap['list0'].marker);
        });
       
        var classname = 'list0';
        var grandchild = $(document.createElement('a'))
            .attr({
                'href':'#',
            }).css({
                'background':'#eee',
                'display':'block',
                'font-weight':'bold',
                'margin':'3px 0',
                'padding':'0 5px'
            }).text( 'YOU' );

        var child = $(document.createElement('li')).attr({'class': classname }).append( grandchild );
        list.append( child );
       
        //data
        for (var i=0,j=aplaces.length;i<j;i++){
            
            var item = aplaces[i];
            var lat = item.lat;
            var lon = item.lon;

            var myLatLng = new google.maps.LatLng(lat,lon);
            var marker = new google.maps.Marker({
                position: myLatLng,
                map: map,
                title: item.text
            }); 
            
            var classname = 'list'+(i+1);
            var grandchild = $(document.createElement('a'))
                .attr({
                        'href':'#',
                        'data-woeid': item.woeid
                }).css({
                    'background':'#eee',
                    'display':'block',
                    'font-weight':'bold',
                    'margin':'3px 0',
                    'padding':'0 5px'
                }).text( item.text );
            
            var child = $(document.createElement('li')).attr({'class': classname }).append( grandchild );
            list.append( child );
       
            bounds.extend(myLatLng);
            map.fitBounds(bounds);
     
            var content = '<a href="http://news.search.yahoo.com/search?p=' + item.text + '" target="_blank">' + item.text + '</a>';
            markermap[classname] = {'marker': marker, 'content': content} ;
            bindPopup(i+1);
        };
    
        $('#woe-overlay').prepend( list );
        $('#woe-overlay').prepend( btn );

        //bind event
        btn.click(function(){
            $('#woe-overlay').hide();
        });

        list.delegate('li','click',function(e){
            e.preventDefault();
            var key = $(this).attr('class');
            infoWindow.setContent(markermap[key].content);
            infoWindow.open(map, markermap[key].marker);
        });
        
        function bindPopup(i) {
            google.maps.event.addListener(markermap['list'+i].marker, 'click', function(event) {
                infoWindow.setContent(markermap['list'+i].content);
                infoWindow.open(map, markermap['list'+i].marker);
            });
        }

        //console.log(markermap);
    }

    function handleError() {
        alert('bad luck, try another article!');
    }
    
});