/*
  Copyright 2010 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

(function() {
  var id =1;
  var Country = function(name, internetUsers, population, birthRate, oilConsumption, gdp) {
    this.id = id++;
    this.name = name;
    this.internetUsers = internetUsers;
    this.population = population;
    this.birthRate = birthRate;
    this.oilConsumption = oilConsumption;
    this.gdp = gdp;
  };

  Country.prototype.toString = function() {
    return this.name + "(" + this.id + ")";
  };

  // TODO(battlehorse): Logarithmic ranges cannot handle a minRange == 0, so here we
  // hack in a minValue of 1.
  var logMeta = new rhizo.meta.LogarithmRangeKind(2, true);
   logMeta.toHumanLabel_ = rhizo.ui.toHumanLabel;
   
  var metamodel = {
    name: { kind: rhizo.meta.Kind.STRING, label: 'Name'},
    internetUsers: { kind: logMeta, label: 'Internet Users',
                     min: 0, max: 300000000 },
    population: { kind: logMeta, label: 'Population',
                  min: 0, max: 1400000000},
    birthRate: { kind: rhizo.meta.Kind.DECIMALRANGE, label: 'Birth Rate',
                 min: 0, max: 55.0},
    oilConsumption: { kind: logMeta, label: 'Oil Consumption',
                      min: 0, max: 20000000},
    gdp: { kind: logMeta, label: 'GDP per capita',
           min: 0, max: 130000}
  };

  var renderer = {
    render: function(model, expanded, renderingHints) {
      return $("<div class='rhizo-sample'>" +
               "<p><b>" + model.name + "</b></p></div>");
    },
    cacheDimensions: true
  };

  var countries = [];
  // All data are extracted from the CIA factbook tables:
  // https://www.cia.gov/library/publications/the-world-factbook/

  // Country,Internet Users,Population,Birth Rate,Oil Consumption,GDP Per Capita
  countries.push(new Country("China",298000000,1330141295,12.17,7999000,6600));
  countries.push(new Country("India",81000000,1173108018,21.34,2670000,3100));
  countries.push(new Country("United States",231000000,310232863,13.83,19500000,46400));
  countries.push(new Country("Indonesia",30000000,242968342,18.45,1564000,4000));
  countries.push(new Country("Brazil",64948000,201103330,18.11,2520000,10200));
  countries.push(new Country("Pakistan",18500000,177276594,25.09,383000,2600));
  countries.push(new Country("Bangladesh",556000,158065841,23.8,95000,1600));
  countries.push(new Country("Nigeria",11000000,152217341,36.07,286000,2400));
  countries.push(new Country("Russia",45250000,139390205,11.11,2800000,15100));
  countries.push(new Country("Japan",90910000,126804433,7.41,4785000,32600));
  countries.push(new Country("Mexico",23260000,112468855,19.39,1772000,13500));
  countries.push(new Country("Philippines",5618000,99900177,25.68,313000,3300));
  countries.push(new Country("Vietnam",20834000,89571130,17.29,276400,2900));
  countries.push(new Country("Ethiopia",360000,88013491,43.34,37000,900));
  countries.push(new Country("Germany",61973000,82282988,8.21,2569000,34100));
  countries.push(new Country("Egypt",11414000,80471869,25.02,712700,6000));
  countries.push(new Country("Turkey",24483000,77804122,18.28,631800,11200));
  countries.push(new Country("Congo, Democratic Republic of the",290000,70916439,42.26,11000,300));
  countries.push(new Country("Iran",23000000,67037517,17.33,1497000,12900));
  countries.push(new Country("Thailand",16100000,66404688,13.21,690400,8100));
  countries.push(new Country("France",42912000,64057792,12.43,1986000,32800));
  countries.push(new Country("United Kingdom",48755000,61284806,10.67,1710000,35200));
  countries.push(new Country("Italy",24992000,58090681,8.01,1639000,30300));
  countries.push(new Country("Burma",108900,53414374,19.49,41000,1100));
  countries.push(new Country("South Africa",4187000,49109107,19.61,583000,10100));
  countries.push(new Country("Korea, South",37476000,48636068,8.72,2175000,28000));
  countries.push(new Country("Ukraine",10354000,45415596,9.62,199000,6400));
  countries.push(new Country("Colombia",17117000,44205293,17.76,291000,9200));
  countries.push(new Country("Sudan",4200000,41980182,33.25,86000,2300));
  countries.push(new Country("Tanzania",520000,41892895,33.44,32000,1400));
  countries.push(new Country("Argentina",11212000,41343201,17.75,610000,13800));
  countries.push(new Country("Spain",25240000,40548753,9.54,1562000,33700));
  countries.push(new Country("Kenya",3360000,40046566,35.14,75000,1600));
  countries.push(new Country("Poland",18679000,38463689,10.04,544800,17900));
  countries.push(new Country("Algeria",4100000,34586184,16.71,299000,7000));
  countries.push(new Country("Canada",25086000,33759742,10.28,2260000,38400));
  countries.push(new Country("Uganda",2500000,33398682,47.55,13000,1300));
  countries.push(new Country("Morocco",10300000,31627428,19.4,187000,4600));
  countries.push(new Country("Peru",7128000,29907003,19,160000,8600));
  countries.push(new Country("Iraq",300000,29671605,29.41,500000,3600));
  countries.push(new Country("Saudi Arabia",7700000,29207277,28.21,2380000,20400));
  countries.push(new Country("Afghanistan",500000,29121286,38.11,5000,800));
  countries.push(new Country("Nepal",499000,28951852,22.43,18000,1200));
  countries.push(new Country("Uzbekistan",2469000,27865738,17.51,148000,2800));
  countries.push(new Country("Venezuela",7167000,27223228,20.29,760000,13100));
  countries.push(new Country("Malaysia",16903000,26160256,22.06,547000,14800));
  countries.push(new Country("Ghana",997000,24339838,28.09,56000,1500));
  countries.push(new Country("Yemen",370000,23495361,34.37,149000,2500));
  countries.push(new Country("Taiwan",15143000,23024956,8.97,800800,29800));
  countries.push(new Country("Korea, North",0,22757275,14.58,16000,1900));
  countries.push(new Country("Syria",3565000,22198110,24.44,256000,4600));
  countries.push(new Country("Romania",6132000,22181287,10.43,219000,11500));
  countries.push(new Country("Mozambique",350000,22061451,37.8,16000,900));
  countries.push(new Country("Australia",15170000,21515754,12.39,953700,38800));
  countries.push(new Country("Sri Lanka",1164000,21513990,15.88,89000,4500));
  countries.push(new Country("Madagascar",316100,21281844,37.89,20000,1000));
  countries.push(new Country("Cote d'Ivoire",660000,21058798,31.48,25000,1700));
  countries.push(new Country("Cameroon",725000,19294149,33.58,26000,2300));
  countries.push(new Country("Netherlands",14273000,16783092,10.3,962900,39200));
  countries.push(new Country("Chile",5456000,16746491,14.46,277000,14700));
  countries.push(new Country("Burkina Faso",140000,16241811,43.98,9000,1200));
  countries.push(new Country("Niger",80000,15878271,51.08,6000,700));
  countries.push(new Country("Kazakhstan",2300000,15460484,16.66,239000,11800));
  countries.push(new Country("Malawi",316100,15447500,41.28,8000,900));
  countries.push(new Country("Ecuador",1310000,14790608,20.32,191000,7400));
  countries.push(new Country("Cambodia",74000,14753320,25.77,4000,1900));
  countries.push(new Country("Senegal",1020000,14086103,36.36,38000,1600));
  countries.push(new Country("Mali",200000,13796354,46.09,5000,1200));
  countries.push(new Country("Guatemala",1960000,13550440,27.4,76000,5200));
  countries.push(new Country("Angola",550000,13068161,43.33,64000,8900));
  countries.push(new Country("Zambia",700000,12056923,39.93,16000,1500));
  countries.push(new Country("Zimbabwe",1421000,11651858,31.57,13000,0));
  countries.push(new Country("Cuba",1450000,11477459,11.02,176000,9700));
  countries.push(new Country("Rwanda",300000,11055976,37.26,6000,900));
  countries.push(new Country("Greece",4253000,10749943,9.34,434000,32100));
  countries.push(new Country("Portugal",4476000,10735765,10.12,291700,21800));
  countries.push(new Country("Tunisia",2800000,10589025,15.31,90000,8000));
  countries.push(new Country("Chad",130000,10543464,40.12,1000,1600));
  countries.push(new Country("Belgium",7292000,10423493,10.1,716800,36600));
  countries.push(new Country("Guinea",90000,10324025,37.21,9000,1000));
  countries.push(new Country("Czech Republic",6028000,10201707,8.76,212800,25100));
  countries.push(new Country("Somalia",102000,10112453,43.33,5000,600));
  countries.push(new Country("Bolivia",1000000,9947418,25.16,60000,4600));
  countries.push(new Country("Hungary",5873000,9880059,9.43,162100,18600));
  countries.push(new Country("Burundi",65000,9863117,41.43,3000,300));
  countries.push(new Country("Dominican Republic",2147000,9794487,22.13,119000,8300));
  countries.push(new Country("Belarus",3107000,9612632,9.76,184000,11600));
  countries.push(new Country("Haiti",1000000,9203083,28.7,12000,1300));
  countries.push(new Country("Sweden",8100000,9074055,10.14,351800,36800));
  countries.push(new Country("Benin",160000,9056010,38.67,21000,1500));
  countries.push(new Country("Azerbaijan",1485000,8303512,17.75,126000,10400));
  countries.push(new Country("Austria",5937000,8214160,8.65,244900,39400));
  countries.push(new Country("Honduras",658500,7989415,25.61,52000,4200));
  countries.push(new Country("Switzerland",5739000,7623438,9.56,275600,41700));
  countries.push(new Country("Tajikistan",600000,7487489,26.49,36000,1800));
  countries.push(new Country("Israel",2106000,7353985,19.51,235000,28400));
  countries.push(new Country("Serbia",2936000,7344847,9.2,86700,10400));
  countries.push(new Country("Bulgaria",2647000,7148785,9.43,124000,12600));
  countries.push(new Country("Hong Kong",4124000,7089705,7.45,310000,42700));
  countries.push(new Country("Laos",130000,6993767,33.44,3000,2100));
  countries.push(new Country("Libya",323000,6461454,24.58,273000,15200));
  countries.push(new Country("Jordan",1500000,6407085,27.06,108000,5300));
  countries.push(new Country("Paraguay",894200,6375830,17.73,28000,4100));
  countries.push(new Country("Togo",350000,6199841,36.23,20000,900));
  countries.push(new Country("Papua New Guinea",120000,6064515,26.95,33000,2400));
  countries.push(new Country("El Salvador",826000,6052064,18.06,45000,7100));
  countries.push(new Country("Nicaragua",185000,5995928,22.77,29000,2800));
  countries.push(new Country("Eritrea",200000,5792984,33.48,5000,700));
  countries.push(new Country("Denmark",4579000,5515575,10.4,189000,36000));
  countries.push(new Country("Kyrgyzstan",850000,5508626,23.58,15000,2100));
  countries.push(new Country("Slovakia",3566000,5470306,10.55,84990,21200));
  countries.push(new Country("Finland",4383000,5255068,10.37,201200,34900));
  countries.push(new Country("Sierra Leone",13900,5245695,38.79,9000,900));
  countries.push(new Country("United Arab Emirates",2922000,4975593,15.98,463000,42000));
  countries.push(new Country("Turkmenistan",75000,4940916,19.62,153400,6900));
  countries.push(new Country("Central African Republic",19000,4844927,36.79,2000,700));
  countries.push(new Country("Singapore",3370000,4701069,8.65,934000,50300));
  countries.push(new Country("Norway",3935000,4676305,10.9,220200,58600));
  countries.push(new Country("Bosnia and Herzegovina",1308000,4621598,8.87,29000,6300));
  countries.push(new Country("Georgia",1024000,4600825,10.7,14000,4400));
  countries.push(new Country("Costa Rica",1460000,4516220,16.65,45000,10900));
  countries.push(new Country("Croatia",1880000,4486881,9.63,105000,17600));
  countries.push(new Country("Moldova",850000,4317483,11.16,17000,2300));
  countries.push(new Country("New Zealand",3047000,4252277,13.81,154100,27300));
  countries.push(new Country("Ireland",2830000,4250163,14.1,188000,42200));
  countries.push(new Country("Congo, Republic of the",155000,4125916,41.01,9000,4100));
  countries.push(new Country("Lebanon",2190000,4125247,15.1,92000,13100));
  countries.push(new Country("Puerto Rico",1000000,3977663,11.65,185300,17200));
  countries.push(new Country("Liberia",20000,3685076,38.14,4000,500));
  countries.push(new Country("Albania",471000,3659616,15.39,34000,6300));
  countries.push(new Country("Lithuania",1777000,3545319,9.21,73000,15400));
  countries.push(new Country("Uruguay",1340000,3510386,13.67,41000,12700));
  countries.push(new Country("Panama",934500,3410676,19.71,94000,11900));
  countries.push(new Country("Mauritania",45000,3205060,33.67,21000,2100));
  countries.push(new Country("Mongolia",330000,3086918,21.03,15000,3200));
  countries.push(new Country("Oman",465000,2967717,23.9,81000,23900));
  countries.push(new Country("Armenia",191000,2966802,12.74,48000,5900));
  countries.push(new Country("Jamaica",1540000,2847232,19.47,78000,8200));
  countries.push(new Country("Kuwait",1000000,2789132,21.64,325000,54100));
  countries.push(new Country("West Bank",356000,2514845,24.91,26500,2900));
  countries.push(new Country("Latvia",1254000,2217969,9.9,39000,14500));
  countries.push(new Country("Namibia",113500,2128471,21.82,21000,6400));
  countries.push(new Country("Macedonia",847900,2072086,11.92,14200,9000));
  countries.push(new Country("Botswana",120000,2029307,22.54,15000,13100));
  countries.push(new Country("Slovenia",1126000,2003136,8.92,56000,27900));
  countries.push(new Country("Lesotho",73300,1919552,27.17,2000,1700));
  countries.push(new Country("Gambia, The",114200,1824158,37.31,2000,1400));
  countries.push(new Country("Kosovo",0,1815048,0,0,2500));
  countries.push(new Country("Gaza Strip",356000,1604238,36.26,0,0));
  countries.push(new Country("Guinea-Bissau",37100,1565126,35.56,3000,600));
  countries.push(new Country("Gabon",90000,1545255,35.39,14000,13900));
  countries.push(new Country("Swaziland",48200,1354051,27.12,4000,4400));
  countries.push(new Country("Mauritius",380000,1294104,14.17,23000,12400));
  countries.push(new Country("Estonia",888100,1291170,10.42,29000,18700));
  countries.push(new Country("Trinidad and Tobago",227000,1228691,14.37,41000,23100));
  countries.push(new Country("Timor-Leste",1800,1154625,25.93,0,2400));
  countries.push(new Country("Cyprus",334400,1102677,11.38,59000,21200));
  countries.push(new Country("Fiji",103000,957780,21.65,10000,3900));
  countries.push(new Country("Qatar",436000,840926,15.54,129000,121700));
  countries.push(new Country("Comoros",23000,773407,34.71,1000,1000));
  countries.push(new Country("Guyana",205000,748486,17.61,11000,3800));
  countries.push(new Country("Djibouti",13000,740528,25.58,13000,2800));
  countries.push(new Country("Bahrain",402900,738004,16.81,38000,38400));
  countries.push(new Country("Bhutan",40000,699847,19.62,1250,5400));
  countries.push(new Country("Montenegro",294000,666730,11.09,0,9800));
  countries.push(new Country("Equatorial Guinea",12000,650702,36,1000,36600));
  countries.push(new Country("Solomon Islands",10000,609794,26.87,2000,2600));
  countries.push(new Country("Macau",259000,567957,8.98,8146,33000));
  countries.push(new Country("Cape Verde",102800,508659,21.67,2000,3400));
  countries.push(new Country("Luxembourg",387000,497538,11.7,59140,78000));
  countries.push(new Country("Western Sahara",0,491519,32.56,2000,2500));
  countries.push(new Country("Suriname",50000,486618,16.61,14000,9000));
  countries.push(new Country("Malta",198800,406771,10.38,19000,23800));
  countries.push(new Country("Maldives",71700,395650,14.5,5490,4200));
  countries.push(new Country("Brunei",217000,395027,18,15000,50100));
  countries.push(new Country("Belize",34000,314522,26.84,7000,8100));
  countries.push(new Country("Bahamas, The",106500,310426,16.25,34000,29800));
  countries.push(new Country("Iceland",250000,308910,13.36,19880,39600));
  countries.push(new Country("French Polynesia",90000,291000,15.67,7000,18000));
  countries.push(new Country("Barbados",188000,285653,12.43,9000,18500));
  countries.push(new Country("Mayotte",0,231139,38.76,0,4900));
  countries.push(new Country("New Caledonia",85000,229993,16.71,13000,15000));
  countries.push(new Country("Netherlands Antilles",0,228693,14.05,71000,16000));
  countries.push(new Country("Vanuatu",17000,221552,21.08,1000,4800));
  countries.push(new Country("Samoa",9000,192001,22.92,1000,5400));
  countries.push(new Country("Sao Tome and Principe",24800,175808,39.09,1000,1700));
  countries.push(new Country("Saint Lucia",100000,160922,14.81,3000,10900));
  countries.push(new Country("Tonga",8400,122580,17.78,1000,4600));
  countries.push(new Country("Virgin Islands",30000,109775,11.61,72860,14500));
  countries.push(new Country("Grenada",24000,107818,17.2,3000,10800));
  countries.push(new Country("Micronesia, Federated States of",16000,107154,22.57,0,2200));
  countries.push(new Country("Aruba",24000,104589,12.77,8000,21800));
  countries.push(new Country("Saint Vincent and the Grenadines",66000,104217,14.89,2000,18100));
  countries.push(new Country("Kiribati",2000,99482,23.06,0,6100));
  countries.push(new Country("Jersey",29000,91812,8.56,0,57000));
  countries.push(new Country("Seychelles",32000,88340,15.53,7000,19400));
  countries.push(new Country("Antigua and Barbuda",65000,86754,16.43,5000,18100));
  countries.push(new Country("Andorra",59100,84525,10.03,0,44900));
  countries.push(new Country("Isle of Man",0,76913,10.7,0,35000));
  countries.push(new Country("Dominica",27500,72813,15.68,1000,10200));
  countries.push(new Country("Bermuda",51000,68268,11.47,5000,69900));
  countries.push(new Country("American Samoa",0,66432,23.05,4000,8000));
  countries.push(new Country("Marshall Islands",2200,65859,29.94,0,2500));
  countries.push(new Country("Guernsey",46100,65632,8.55,0,44600));
  countries.push(new Country("Greenland",36000,57637,14.68,5172,35900));
  countries.push(new Country("Cayman Islands",23000,50209,12.29,3000,43800));
  countries.push(new Country("Saint Kitts and Nevis",16000,49898,14.23,1000,15200));
  countries.push(new Country("Faroe Islands",37500,49057,12.9,5000,48200));
  countries.push(new Country("Northern Mariana Islands",0,48317,21.05,0,12500));
  countries.push(new Country("Liechtenstein",23000,35002,9.69,0,122100));
  countries.push(new Country("San Marino",17000,31477,9.18,0,41900));
  countries.push(new Country("Monaco",22000,30586,7.03,0,30000));
  countries.push(new Country("Saint Martin",0,30235,0,0,0));
  countries.push(new Country("Gibraltar",6500,28877,14.2,24000,38400));
  countries.push(new Country("British Virgin Islands",4000,24939,14.52,1000,38500));
  countries.push(new Country("Turks and Caicos Islands",0,23528,20.44,0,11500));
  countries.push(new Country("Palau",0,20879,10.68,0,8100));
  countries.push(new Country("Akrotiri",0,15700,0,0,0));
  countries.push(new Country("Dhekelia",0,15700,0,0,0));
  countries.push(new Country("Wallis and Futuna",1200,15343,0,0,3800));
  countries.push(new Country("Anguilla",4500,14764,12.94,0,12200));
  countries.push(new Country("Nauru",0,14264,23.56,1000,5000));
  countries.push(new Country("Cook Islands",5000,11488,15.67,1000,9100));
  countries.push(new Country("Tuvalu",4200,10472,23.01,0,1600));
  countries.push(new Country("Saint Helena, Ascension, and Tristan da Cunha",1100,7670,10.95,0,2500));
  countries.push(new Country("Saint Barthelemy",0,7406,0,0,0));
  countries.push(new Country("Saint Pierre and Miquelon",0,6010,9.15,1000,7000));
  countries.push(new Country("Montserrat",1200,5118,12.11,1000,3400));
  countries.push(new Country("Falkland Islands (Islas Malvinas)",2800,3140,0,0,35400));
  countries.push(new Country("Norfolk Island",0,2155,0,0,0));
  countries.push(new Country("Svalbard",0,2067,0,0,0));
  countries.push(new Country("Christmas Island",464,1402,0,0,0));
  countries.push(new Country("Tokelau",800,1400,0,0,1000));
  countries.push(new Country("Niue",1000,1354,0,0,5800));
  countries.push(new Country("Holy See (Vatican City)",0,829,0,0,0));
  countries.push(new Country("Cocos (Keeling) Islands",0,596,0,0,0));
  countries.push(new Country("Pitcairn Islands",0,48,0,0,0));

  {{ jsonp_callback }}({
      'renderer': renderer,
      'metamodel': metamodel,
      'models': countries});
})();
