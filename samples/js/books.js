/*
  Copyright 2008 Riccardo Govoni battlehorse@gmail.com

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

namespace("sample");

sample.Book = function(isbn, title, img, rating, price, genres, paperback) {
  this.id = isbn;
  this.isbn = isbn;
  this.title = title;
  this.img = img;
  this.rating = rating;
  this.price = price;
  this.genres = genres;
  this.paperback = paperback;
};

sample.Book.prototype.toString = function() {
  return this.title + "(" + this.isbn + ")";
};


var models = [
  new sample.Book('1590595009',
                  'Writing Scientific Software',
                  'http://ecx.images-amazon.com/images/I/41PSP75PJFL._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  4,
                  16.49,
                  ['programming', 'manual'],
                  true),
  new sample.Book('1590593898',
                  'Joel On Software',
                  'http://ecx.images-amazon.com/images/I/51MeZFORwWL._SL160_AA115_.jpg',
                  3,
                  18.20,
                  ['programming', 'history'],
                  false),
  new sample.Book('0321525655',
                  'Presentation Zen',
                  'http://ecx.images-amazon.com/images/I/41hMmcWQdwL._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  4,
                  65.79,
                  ['programming'],
                  true),
  new sample.Book('0340284028',
                  'Swallowing Darkness',
                  'http://ecx.images-amazon.com/images/I/51iOGCvzybL._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  5,
                  25,
                  [ 'crime'],
                  false),
  new sample.Book('8938928494',
                  'Gone With the Wind',
                  'http://ecx.images-amazon.com/images/I/51vjRjG5UxL._SL160_AA115_.jpg',
                  2,
                  27,
                  [ 'romance'],
                  false),
  new sample.Book('382822833',
                  'Art: A world History',
                  'http://ecx.images-amazon.com/images/I/514dfpLu5GL._SL160_AA115_.jpg',
                  3,
                  95,
                  [ 'manual'],
                  false),
  new sample.Book('84823221177',
                  "The Sagan Diary",
                  'http://ecx.images-amazon.com/images/I/51FlsY9OKVL._SL160_AA115_.jpg',
                  5,
                  10.3,
                  [ 'sci-fi', 'crime'],
                  true),
  new sample.Book('14823221177',
                  "The Last Patrion",
                  'http://ecx.images-amazon.com/images/I/51de0isP05L._SL500_SL150_.jpg',
                  1,
                  43,
                  [ 'politics', 'crime'],
                  true),
  new sample.Book('84823421177',
                  "Brisingr (Inheritance)",
                  'http://ecx.images-amazon.com/images/I/51ynF4PIThL._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  2,
                  72,
                  [ 'fantasy', 'romance'],
                  false),
  new sample.Book('84823226677',
                  "Rediscover God in America",
                  'http://ecx.images-amazon.com/images/I/41VR8ZKNKKL._SL500_SL150_.jpg',
                  4,
                  35,
                  [ 'politics'],
                  true),
  new sample.Book('84823221187',
                  "The Digital Photography Book",
                  'http://ecx.images-amazon.com/images/I/4127fI6pghL._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  4,
                  24.3,
                  [ 'manual'],
                  true),
  new sample.Book('848000000',
                  "Apple Aperture 2",
                  'http://ecx.images-amazon.com/images/I/51PmGTgxJ6L._SL160_PIsitb-sticker-arrow-dp,TopRight,12,-18_SH30_OU01_AA115_.jpg',
                  3,
                  43,
                  [ 'programming', 'manual'],
                  false),
  new sample.Book('848232890077',
                  "Anne Frank: The Diary",
                  'http://ecx.images-amazon.com/images/I/519HKX9M69L._SL500_SL150_.jpg',
                  5,
                  10.3,
                  [ 'history'],
                  true)
];

var metamodel = {
  isbn: { kind: rhizo.meta.Kind.STRING, label: "ISBN" },
  title: { kind: rhizo.meta.Kind.STRING, label: "Title" },  
  rating: { kind: rhizo.meta.Kind.RANGE, label: "Rating", min: 1, max: 5, stepping: 1},
  price: { kind: rhizo.meta.Kind.RANGE, label: "Price", min: 1, max: 100},
  paperback: { kind: rhizo.meta.Kind.BOOLEAN, label: "Paperback" },
  genres: { kind: rhizo.meta.Kind.CATEGORY, label: "Genres" , 
            categories: [ 'sci-fi', 'fantasy', 'crime' , 'politics', 'fiction', 'romance', 'programming', 'manual', 'history'] , 
            multiple: true}
};

var renderer = {
  render: function(model) {
    return $("<div style='padding: 5px'>" + 
             "<p style='white-space: nowrap; overflow:hidden'><img src='" + model.img + "' align='left' width='75px'>" + 
             "<b>" + model.title + "</b><br />" +
             "Rating: " + this.stars(model) + "<br />" +
             "Price: " + this.price(model) + "</p>" +
             "</div>");
  },
  stars: function(model) {
    var str = [];
    for (i = 0; i < model.rating; i++) {
      str.push("<img src='i/star.png'>");
    }
    return str.join("");
  },
  price: function(model) {
    if (model.price > 50) {
      return "<span style='color: red'>" + model.price + " $</span>";
    } else {
      return "" + model.price + " $";
    }
  }
};

// hack to remove the tree layout in this demo
delete rhizo.layout.layouts.tree;

rhizo.bootstrap.setRenderer(renderer);
rhizo.bootstrap.setMetaModel(metamodel);
rhizo.bootstrap.deploy(models);