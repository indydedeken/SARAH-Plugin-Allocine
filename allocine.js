exports.action = function(data, callback, config, SARAH){

  var place = data.place || 'B0059';

  var url = 'http://www.allocine.fr/seance/salle_gen_csalle='+place+'.html';
  var request = require('request');
  request({ 'uri' : url }, function (err, response, body){
    
    if(err || response.statusCode != 200) {
      callback({'tts': "L'action a échoué. Erreur " + response.statusCode});
      return;
    }

    var $ = require('cheerio').load(body, { xmlMode: true, ignoreWhitespace: false, lowerCaseTags: false });
    var options = list($);
    options.tts = 'Voici la liste des films au ' + options.theatre + ': ' + options.movies.join(', ');

    if (data.movie){
      options.hours = hours($, data.movie);
      options.tts   = 'Voici les horaires de '+ options.movies[data.movie] +' au ' + options.theatre + ': ';
      options.tts  += options.hours.join('. ');
    } else {
      update(data.directory, options.movies, place);
    }

    callback(options);
  });
}

  // ------------------------------------------
  //  HELPER
  // ------------------------------------------


if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;');
  };
}

  // ------------------------------------------
  //  SCRAPING
  // ------------------------------------------

var list = function($){
  var theatre = $('DIV.boxbasichdr span').text();
  var movies  = $('DIV.line A[href^="#movie"]').map(function(){ return $(this).text(); });
  return {
    'theatre' : theatre,
    'movies'  : movies
  };
}

var hours = function($, pos){
  return $('DIV.cell').eq(pos).find('DIV[style*=red]').map(function(){ return clean($(this).text()); });
}

var clean = function(hours){
  hours = hours.replace(/<br>/g,'. ').replace(/Lun[-,]* /g,'Lundi ')
               .replace(/Mar[-,]* /g,'Mardi ').replace(/Mer[-,]* /g,'Mercredi ')
               .replace(/Jeu[-,]* /g,'Jeudi ').replace(/Ven[-,]* /g,'Vendredi ')
               .replace(/Sam[-,]* /g,'Samedi ').replace(/Dim[-,]* /g,'Dimanche ');
  return hours;
}

  // ------------------------------------------
  //  UPDATING XML
  // ------------------------------------------

var update = function(directory, movies, place){
  if (!directory){ return; }
  if (!movies || movies.length == 0){ return; }

  var fs   = require('fs');
  var file = directory + '/../plugins/allocine/allocine.xml';
  var xml  = fs.readFileSync(file,'utf8');

  var replace  = '§ -->\n';
      replace += '<rule id="ruleMovieName">\n';
      replace += '  <tag>out.place="'+place+'";</tag>\n';
      replace += '  <one-of>\n';

  for(var i = 0 ; i < movies.length ; i++){
      var movie =  movies[i]; movie = movie.indexOf(':') > 0 ? movie.substring(0,movie.indexOf(':')) : movie; // Split at ':'
      replace += '    <item>'+movie.encodeHTML()+'<tag>out.movie="'+i+'";</tag></item>\n';
  }
      replace += '  </one-of>\n';
      replace += '</rule>\n';
      replace += '<!-- §';

  var regexp = new RegExp('§[^§]+§','gm');
  var xml    = xml.replace(regexp,replace);

  fs.writeFileSync(file, xml, 'utf8');
}
