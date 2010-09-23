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

(function(){
  var Country = function(id, name) {
    this.id = id;
    this.name = name;
    this.kind = 'Country';
    this.imgName = 'usa.png';
  };

  Country.prototype.toString = function() {
    return this.kind + ": " + this.name;
  };

  var Region = function(id, name, parentId) {
    this.id = id;
    this.name = name;
    this.hierarchy = parentId;
    this.kind = 'Region';
  };
  Region.prototype.toString = Country.prototype.toString;

  var Division = function(id, name, parentId) {
    this.id = id;
    this.name = name;
    this.hierarchy = parentId;
    this.kind = 'Division';
  };
  Division.prototype.toString = Country.prototype.toString;

  var State = function(parentId, id, name) {
    this.id = id;
    this.name = name;
    this.hierarchy = parentId;  
    this.kind = 'State';
    this.imgName = name.toLowerCase().replace(/ /g, '_') + '.png'; 
  };
  State.prototype.toString = Country.prototype.toString;

  var City = function(id, name, state, population, density) {
    this.id = id;
    this.name = name;
    this.state = state;
    this.population = population;
    this.density = density;
    this.kind = 'City';
  
    for (var i = 0; i < states.length; i++) {
      if (states[i].name == state) {
        this.hierarchy = states[i].id;
      }
    }
  };
  City.prototype.toString = Country.prototype.toString;

  var models = [
    new Country(999, "USA"), // id, name
    new Region(1, "NorthEast",999), // id , name, parent_id
    new Region(2, "MidWest",999),
    new Region(3, "South",999),
    new Region(4, "West",999),
    new Division(11, "New England", 1),  // id, name, parent_id
    new Division(12, "Middle Atlantic", 1),
    new Division(23, "East North Central", 2),
    new Division(24, "West North Central", 2),
    new Division(35, "South Atlantic", 3),
    new Division(36, "East South Central", 3),
    new Division(37, "West South Central", 3),
    new Division(48, "Mountain", 4),
    new Division(49, "Pacific", 4) ];

   var states = [
     new State(11,1101,"Maine"),  // parent_id, id, name
     new State(11,1102,"New Hampshire"),
     new State(11,1103,"Vermont"),
     new State(11,1104,"Massachusetts"),
     new State(11,1105,"Rhode Island"),
     new State(11,1106,"Connecticut"),
     new State(12,1207,"New York"),
     new State(12,1208,"Pennsylvania"),
     new State(12,1209,"New Jersey"),
     new State(23,2300,"Wisconsin"),
     new State(23,2311,"Michigan"),
     new State(23,2312,"Illinois"),
     new State(23,2313,"Indiana"),
     new State(23,2314,"Ohio"),
     new State(24,2415,"North Dakota"),
     new State(24,2416,"South Dakota"),
     new State(24,2417,"Nebraska"),
     new State(24,2418,"Kansas"),
     new State(24,2419,"Minnesota"),
     new State(24,2420,"Iowa"),
     new State(24,2421,"Missouri"),
     new State(35,3522,"Delaware"),
     new State(35,3523,"Maryland"),
     new State(35,3524,"District of Columbia"),
     new State(35,3525,"Virginia"),
     new State(35,3526,"West Virginia"),
     new State(35,3527,"North Carolina"),
     new State(35,3528,"South Carolina"),
     new State(35,3529,"Georgia"),
     new State(35,3530,"Florida"),
     new State(36,3631,"Kentucky"),
     new State(36,3632,"Tennessee"),
     new State(36,3633,"Mississippi"),
     new State(36,3634,"Alabama"),
     new State(37,3735,"Oklahoma"),
     new State(37,3736,"Texas"),
     new State(37,3737,"Arkansas"),
     new State(37,3738,"Louisiana"),
     new State(48,4839,"Idaho"),
     new State(48,4840,"Montana"),
     new State(48,4841,"Wyoming"),
     new State(48,4842,"Nevada"),
     new State(48,4843,"Utah"),
     new State(48,4844,"Colorado"),
     new State(48,4845,"Arizona"),
     new State(48,4846,"New Mexico"),
     new State(49,4947,"Alaska"),
     new State(49,4948,"Washington"),
     new State(49,4949,"Oregon"),
     new State(49,4950,"California"),
     new State(49,4951,"Hawaii") ];

  for (var i = 0; i < states.length; i++) {
    models.push(states[i]);
  }

  var cities = [
    // id, name, state, population, density
    new City(201,'New York City','New York','8,274,527','26,403.8'),
    new City(202,'Los Angeles','California','3,834,340','7,876.4'),
    new City(203,'Chicago','Illinois','2,836,658','12,752.2'),
    new City(204,'Houston','Texas','2,208,180','3,371.8'),
    new City(205,'Phoenix','Arizona','1,552,259','2,781.7'),
    new City(206,'Philadelphia','Pennsylvania','1,449,634','11,232.8'),
    new City(207,'San Antonio','Texas','1,328,984','2,808.3'),
    new City(208,'San Diego','California','1,266,731','3,772.4'),
    new City(209,'Dallas','Texas','1,240,499','3,470.3'),
    new City(210,'San Jose','California','939,899','5,116.9'),
    new City(211,'Detroit','Michigan','916,952','6,853.5'),
    new City(212,'Jacksonville','Florida','805,605','970.9'),
    new City(213,'Indianapolis','Indiana','795,458','2,162.8'),
    new City(214,'San Francisco','California','764,976','16,632.4'),
    new City(215,'Columbus','Ohio','747,755','3,383.1'),
    new City(216,'Austin','Texas','743,074','2,610.6'),
    new City(217,'Fort Worth','Texas','681,818','1,828.0'),
    new City(218,'Memphis','Tennessee','674,028','2,327.6'),
    new City(219,'Charlotte','North Carolina','671,588','2,232.1'),
    new City(220,'Baltimore','Maryland','637,455','8,058.8'),
    new City(221,'El Paso','Texas','606,913','2,262.8'),
    new City(222,'Milwaukee','Wisconsin','602,191','6,212.0'),
    new City(223,'Boston','Massachusetts','599,351','12,172.3'),
    new City(224,'Seattle','Washington','594,210','6,714.8'),
    new City(225,'Nashville','Tennessee','590,807','1,152.6'),
    new City(226,'Denver','Colorado','588,349','3,615.6'),
    new City(227,'Washington','District of Columbia','588,292','9,316.9'),
    new City(228,'Las Vegas','Nevada','558,880','4,222.7'),
    new City(229,'Louisville','Kentucky','557,789','4,126.1'),
    new City(230,'Portland','Oregon','550,396','3,939.8'),
    new City(231,'Oklahoma City','Oklahoma','547,274','833.8'),
    new City(232,'Tucson','Arizona','525,529','2,499.7'),
    new City(233,'Atlanta','Georgia','519,145','3,162.3'),
    new City(234,'Albuquerque','New Mexico','518,271','2,484.0'),
    new City(235,'Fresno','California','470,508','4,096.3'),
    new City(236,'Long Beach','California','466,520','9,157.2'),
    new City(237,'Sacramento','California','460,242','4,187.4'),
    new City(238,'Mesa','Arizona','452,933','3,171.0'),
    new City(239,'Kansas City','Missouri','450,375','1,408.4'),
    new City(240,'Cleveland','Ohio','438,042','6,165.0'),
    new City(241,'Virginia Beach','Virginia','434,743','1,712.7'),
    new City(242,'Omaha','Nebraska','424,482','3,370.8'),
    new City(243,'Miami','Florida','409,719','10,153.2'),
    new City(244,'Oakland','California','401,489','7,120.9'),
    new City(245,'Tulsa','Oklahoma','384,037','2,152.5'),
    new City(246,'Minneapolis','Minnesota','377,392','6,969.4'),
    new City(247,'Colorado Springs','Colorado','376,427','1,943.4'),
    new City(248,'Raleigh','North Carolina','375,806','2,409.2'),
    new City(249,'Honolulu','Hawaii','375,571','4,336.7'),
    new City(250,'Arlington','Texas','371,038','3,475.7'),
    new City(251,'Wichita','Kansas','361,420','2,535.2'),
    new City(252,'St. Louis','Missouri','350,759','5,625.0'),
    new City(253,'Santa Ana','California','339,555','12,471.5'),
    new City(254,'Tampa','Florida','336,823','2,706.9'),
    new City(255,'Anaheim','California','333,249','6,707.9'),
    new City(256,'Cincinnati','Ohio','332,458','4,247.2'),
    new City(257,'Bakersfield','California','315,837','2,184.4'),
    new City(258,'Aurora','Colorado','311,794','1,939.6'),
    new City(259,'Pittsburgh','Pennsylvania','311,218','6,017.3'),
    new City(260,'Toledo','Ohio','295,029','3,891.1'),
    new City(261,'Riverside','California','294,437','3,267.2'),
    new City(262,'Stockton','California','287,245','4,456.5'),
    new City(263,'Corpus Christi','Texas','285,507','1,794.7'),
    new City(264,'Newark','New Jersey','280,135','11,493.5'),
    new City(265,'Anchorage','Alaska','279,671','153.4'),
    new City(266,'Lexington','Kentucky','279,044','915.7'),
    new City(267,'St. Paul','Minnesota','277,251','5,438.5'),
    new City(268,'Buffalo','New York','272,632','7,208.1'),
    new City(269,'Plano','Texas','260,796','3,101.0'),
    new City(270,'Glendale','Arizona','253,152','3,928.4'),
    new City(271,'Fort Wayne','Indiana','251,247','2,604.1'),
    new City(272,'Henderson','Nevada','249,386','2,604.1'),
    new City(273,'Lincoln','Nebraska','248,744','3,023.9'),
    new City(274,'Greensboro','North Carolina','247,183','2,138.4'),
    new City(275,'St. Petersburg','Florida','246,407','4,165.0'),
    new City(276,'Chandler','Arizona','246,399','3,049.8'),
    new City(277,'Jersey City','New Jersey','242,389','16,111.1'),
    new City(278,'New Orleans','Louisiana','239,124','2,683.7'),
    new City(279,'Norfolk','Virginia','235,747','4,365.0'),
    new City(280,'Scottsdale','Arizona','235,677','1,100.5'),
    new City(281,'Birmingham','Alabama','229,800','1,619.9'),
    new City(282,'Madison','Wisconsin','228,775','3,028.4'),
    new City(283,'Orlando','Florida','227,907','1,988.8'),
    new City(284,'Baton Rouge','Louisiana','227,071','2,966.4'),
    new City(285,'Chesapeake','Virginia','219,154','584.6'),
    new City(286,'Garland','Texas','218,792','3,778.8'),
    new City(287,'Durham','North Carolina','217,847','1,977.1'),
    new City(288,'Laredo','Texas','217,506','2,249.4'),
    new City(289,'Chula Vista','California','217,478','3,549.2'),
    new City(290,'Lubbock','Texas','217,326','1,738.4'),
    new City(291,'Winston-Salem','North Carolina','215,348','1,705.9'),
    new City(292,'Reno','Nevada','214,853','2,611.9'),
    new City(293,'Hialeah','Florida','212,217','11,792.7'),
    new City(294,'North Las Vegas','Nevada','212,114','1,471.2'),
    new City(295,'Akron','Ohio','207,934','3,495.6'),
    new City(296,'Gilbert','Arizona','207,550','2,551.1'),
    new City(297,'Rochester','New York','206,759','6,138.9'),
    new City(298,'Arlington','Virginia','204,568','7,323.3'),
    new City(299,'Montgomery','Alabama','204,086','1,297.1'),
    new City(100,'Modesto','California','203,955','5,275.3'),
    new City(101,'Boise','Idaho','202,832','2,912.0'),
    new City(102,'Fremont','California','201,334','2,652.1'),
    new City(103,'Irvine','California','201,160','3,096.8'),
    new City(104,'Spokane','Washington','200,975','3,384.6'),
    new City(105,'Richmond','Virginia','200,123','3,291.0'),
    new City(106,'Shreveport','Louisiana','199,569','1,941.3'),
    new City(107,'Irving','Texas','199,505','2,851.4'),
    new City(108,'San Bernardino','California','199,285','3,153.1'),
    new City(109,'Yonkers','New York','199,244','10,833.5'),
    new City(110,'Des Moines','Iowa','196,998','2,621.1'),
    new City(111,'Glendale','California','196,979','6,371.7'),
    new City(112,'Tacoma','Washington','196,520','3,863.4'),
    new City(113,'Grand Rapids','Michigan','193,627','4,435.0'),
    new City(114,'Huntington Beach','California','192,885','7,181.6'),
    new City(115,'Augusta','Georgia','192,142','646.1'),
    new City(116,'Mobile','Alabama','191,411','1,687.2'),
    new City(117,'Moreno Valley','California','188,936','2,780.9'),
    new City(118,'Little Rock','Arkansas','187,452','1,576.0'),
    new City(119,'Columbus','Georgia','187,046','859.7'),
    new City(120,'Amarillo','Texas','186,106','1,931.3'),
    new City(121,'Oxnard','California','184,725','6,733.5'),
    new City(122,'Fort Lauderdale','Florida','183,606','4,807.5'),
    new City(123,'Knoxville','Tennessee','183,546','1,875.8'),
    new City(124,'Fontana','California','183,502','3,571.4'),
    new City(125,'Salt Lake City','Utah','180,651','1,665.8'),
    new City(126,'Newport News','Virginia','179,153','2,637.6'),
    new City(127,'Jackson','Mississippi','175,710','1,756.5'),
    new City(128,'Tempe','Arizona','174,091','3,955.7'),
    new City(129,'Worcester','Massachusetts','173,966','4,591.7'),
    new City(130,'Brownsville','Texas','172,806','1,737.8'),
    new City(131,'Providence','Rhode Island','172,459','9,384.8'),
    new City(132,'Fayetteville','North Carolina','171,853','2,058.1'),
    new City(133,'Huntsville','Alabama','171,327','909.3'),
    new City(134,'Ontario','California','170,936','3,172.8'),
    new City(135,'Aurora','Illinois','170,855','3,714.0'),
    new City(136,'Rancho Cucamonga','California','170,266','3,415.6'),
    new City(137,'Santa Clarita','California','169,951','3,160.8'),
    new City(138,'Chattanooga','Tennessee','169,884','1,150.5'),
    new City(139,'Overland Park','Kansas','169,403','2,629.3'),
    new City(140,'Tallahassee','Florida','168,979','1,573.9'),
    new City(141,'Oceanside','California','168,602','3,966.2'),
    new City(142,'Garden Grove','California','165,610','9,177.6'),
    new City(143,'Vancouver','Washington','161,436','3,354.2'),
    new City(144,'Grand Prairie','Texas','158,422','1,784.7'),
    new City(145,'Cape Coral','Florida','156,981','972.3'),
    new City(146,'Rockford','Illinois','156,596','2,680.6'),
    new City(147,'Dayton','Ohio','155,461','2,978.1'),
    new City(148,'Springfield','Missouri','154,777','2,070.8'),
    new City(149,'Santa Rosa','California','154,241','3,680.7'),
    new City(150,'Pomona','California','152,631','6,555.8')
  ];
  for (var i = 0; i < states.length; i++) {
    models.push(cities[i]);
  }

  var elections = [ 'Democratic' , 'Republican', 'Neutral'];
  // randomly assign a political faction
  for (var i = 0; i < models.length; i++) {
    models[i].election = elections[Math.floor(Math.random()*3)];
  }

  var metamodel = {
    name: { kind: rhizo.meta.Kind.STRING, label: "Name" },
    kind: { kind: rhizo.meta.Kind.CATEGORY, label: "Kind" ,
            categories: [ 'City', 'State', 'Division', 'Region', 'Country'],
            multiple: true },
    election: {kind: rhizo.meta.Kind.CATEGORY, label: "Elections",
               categories: elections },
    hierarchy: { kind: rhizo.meta.Kind.NUMBER, label: "Hierarchy", isParent: true}
  };

  var renderer = {
    render: function(model, expanded, renderingHints) {
      if (renderingHints.small) {
        return $("<div class='rhizo-sample'>" + 
                 "<p><b><span style='color:" +
                 this.getElectionColor(model) + "'>"+ 
                 model.name + "</span></b><br />" +
                 "<span class='dim'>" + model.kind + "</span></p>" +
                 "</div>");
      } else {
        var html = [];
        html.push("<div class='rhizo-sample'>");
        html.push("<p>");
        if (model.kind == 'State' || model.kind == 'Country') {
          html.push("<img src='static/samples/img/usa_flags/" + 
                    model.imgName + "' width='50px' align='left' >");
        }
        html.push("<b><span style='color:" + this.getElectionColor(model) + ";'>" +
                  model.name + "</span></b><br />");
        html.push("<span class='dim'>" + model.kind + "</span></p>");
        html.push("</div>");
        return $(html.join(''));
      }
    },
    getElectionColor: function(model) {
      return model.election == 'Democratic' ?
        'blue' : model.election == 'Republican' ? 'red' : 'black';
    }
  };

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': models});
})();
