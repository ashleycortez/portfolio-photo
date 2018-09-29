/*
* jQuery Flickr Photoset
* https://github.com/hadalin/jquery-flickr-photoset
*
* Copyright 2014, Primož Hadalin
*
* Licensed under the MIT license:
* http://www.opensource.org/licenses/MIT
*/

;(function ($, window, document, undefined) {

    'use strict';

    var pluginName = "flickr",
        defaults = {
            apiKey: "",
            userId: "",
            photosetId: "",
            errorText: "Error generating gallery.",
            loadingSpeed: 38,
            photosLimit: 30
        },
        apiUrl = 'https://api.flickr.com/services/rest/',
        commonParams = '&format=json&api_key=9dcfde14fdcc421c2f3bcaea8d78d1c1&nojsoncallback=true',
        photos = [];

    var client = axios.create({
      // baseURL: 'https://api.flickr.com/services/rest/',
    });

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = $(element);
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;

        this._printError = function() {
            this.element.find('.gallery-container').append($("<div></div>", { "class": "col-lg-12 col-lg-offset-1" })
                .append($("<div></div>", { "class": "error-wrapper" })
                    .append($("<span></span>", { "class": "label label-danger error" })
                        .html(this.settings.errorText))));
        };

        this._printGallery = function(photoset) {
          var galleryContainer = this.element;
          galleryContainer.append($('<h1></h1>').text(photoset.title));
          galleryContainer.append($('<p></p>').text(photoset.desc));
          $.each(Object.keys(photoset.buildings), function(index, building) {
            var buildingDiv = $('<div></div>', {'class': 'building'});
            buildingDiv.append($('<h3></h3>', {'class': 'building-title'}).text(building));
            var photoList = $('<ul></ul>', {'class': 'photo-list'});
            $.each(photoset.buildings[building], function(idx, photo) {
              var photoElem = $('<li></li>', {'class': 'photo-elem'});
              photoElem.append($('<p></p>').text(photo.title));
              photoElem.append($('<img>', {src: photo.full}));
              if (photo.description) {
                photoElem.append($('<p></p>').text(photo.description));
              }
              photoList.append(photoElem);
            })
            buildingDiv.append(photoList);
            galleryContainer.append(buildingDiv);
          });

          $('.spinner-wrapper').hide();
        }

        this._fetchPhotoset = function(photosetId) {
         var metadata = client.get(apiUrl + '?method=flickr.photosets.getInfo&photoset_id=' + photosetId + '&user_id=' + this.settings.userId + commonParams)
            .then(function (response) {
              var result = response.data.photoset;
              return {
                title: result.title._content,
                desc: result.description._content,
              };
            });

          var buildings = client.get(apiUrl + '?method=flickr.photosets.getPhotos&photoset_id=' + photosetId + commonParams)
            .then(function (response) {
              var photos = response.data.photoset.photo;
              var promises = photos.map(function(photo) {
                return client.get(apiUrl + '?photo_id=' + photo.id + '&method=flickr.photos.getInfo' + commonParams)
                  .then(function(result) {
                    var photo = result.data.photo;
                    var tags = photo.tags.tag.map(function(tag) { return tag.raw });
                    return {
                      title: photo.title._content,
                      description: photo.description._content,
                      tags: tags,
                      thumbnail: 'http://farm' + photo.farm + '.static.flickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_q.jpg',
                      full: 'http://farm' + photo.farm + '.static.flickr.com/' + photo.server + '/' + photo.id + '_' + photo.secret + '_b.jpg',
                    };
                  });
              });
              return Promise.all(promises);
            })
            .then(function(photos) {
              var buildingsRes = {};
              for (var i = photos.length - 1; i >= 0; i--) {
                var photo = photos[i];
                for (var j = photo.tags.length - 1; j >= 0; j--) {
                  var tag = photo.tags[j];
                  if (tag.substring(0, 5) == 'bldg:') {
                    var bldg = tag.substring(5, tag.length);
                    if (!buildingsRes.hasOwnProperty(bldg)) {
                      buildingsRes[bldg] = [];
                    }
                    buildingsRes[bldg].push(photo);
                  }
                }
              }
              return buildingsRes;
            });

          return Promise.all([metadata, buildings])
            .then(function(results) {
              var photoset = results[0];
              photoset['buildings'] = results[1];
              return photoset;
            });
        };

        this._flickrInit = function () {
            this._fetchPhotoset(this.settings.photosetId)
                .then(function(photoset) {
                  this._printGallery(photoset);
                }.bind(this))
                .catch(function(error) {
                  console.log(error);
                  this._printError();
                }.bind(this));
        };

        // Init
        this.init();
    }

    Plugin.prototype = {
        init: function () {
            this._flickrInit();
        }
    };

    // Wrapper
    $.fn[pluginName] = function (options) {
        this.each(function () {
            //if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            //}
        });

        // Chain
        return this;
    };

})(jQuery, window, document);