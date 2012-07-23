;(function ($, window, undefined) {

  var pluginName = 'phpfreechat',
      document = window.document,
      defaults = {
        serverUrl: '../server', // phpfreechat server url
        loaded: null,           // executed when interface is loaded
        loadTestData: false,    // load interface data for tests
      };
  var pfc = {}; // to have a global reference to "this" (Plugin)
  
  function Plugin(element, options) {
    // plugin attributs
    pfc = this;
    pfc.element = element;
    pfc.options = $.extend({}, defaults, options) ;
    pfc._defaults = defaults;
    pfc._name = pluginName;

    // check backlink presence
    if (!pfc.hasBacklink()) {
      return;
    }
    
    // load the interface
    pfc.loadHTML();
        
    // try to authenticate
    pfc.tryToLogout(function (err) { pfc.tryToLogin() });
  }
  
  /**
   * Appends a username in the user list 
   * returns the id of the user's dom element
   */
  Plugin.prototype.appendUser = function(user) {

    // user.role = admin or user
    // user.name = nickname
    // user.email = user email used to calculate gravatar
    // user.active = true if active
    
    // default values
    user.id     = (user.id != undefined) ? user.id : 0;
    user.role   = (user.role != undefined) ? user.role : 'user';
    user.name   = (user.name != undefined) ? user.name : 'Guest '+Math.round(Math.random()*100);
    user.email  = (user.email != undefined) ? user.email : '';
    user.active = (user.active != undefined) ? user.active : true;
    
    // user list DOM element
    var users_dom = $(pfc.element).find(user.role == 'admin' ? 'div.pfc-role-admin' :
                                                                'div.pfc-role-user');

    // create a blank DOM element for the user
    var html = $('              <li class="user">'
                +'                <div class="status"></div>'
                +'                <div class="name"></div>'
                +'                <div class="avatar"></div>'
                +'              </li>');

    // fill the DOM element
    if (user.name) {
      html.find('div.name').text(user.name);
    }
    if (users_dom.find('li').length == 0) {
      html.addClass('first');
    }
    html.find('div.status').addClass(user.active ? 'st-active' : 'st-inactive'); 
    html.find('div.avatar').append('<img src="http://www.gravatar.com/avatar/' + md5(user.email) + '?d=wavatar&amp;s=20" alt="" />');

    // get all userids from the list (could be cached)
    var userids = [];
    $(pfc.element).find('div.pfc-users li.user').each(function (i, dom_user) {
      userids.push(parseInt($(dom_user).attr('id').split('_')[1]));
    });
    // if no user id is indicated, generate a new one
    if (user.id == 0) {
      do {
        user.id = Math.round(Math.random()*10000);
      } while (userids.indexOf(user.id) != -1);
    }
    // add the id in the user's dom element
    if (user.id != 0 && userids.indexOf(user.id) == -1) {
      html.attr('id', 'user_'+user.id);
    } else {
      delete html;
      return 0;
    }

    // append the user dom element to the interface
    users_dom.find('ul').append(html);
    pfc.updateRolesTitles();

    return user.id;
  };
  
  /**
    * Remove a user from the user list
    * returns true if user has been found, else returns false
    */
  Plugin.prototype.removeUser = function(userid) {
    var removed = ($(pfc.element).find('#user_'+userid).remove().length > 0);
    pfc.updateRolesTitles();
    return removed;
  }

  /**
    * Hide or show the roles titles
    */
  Plugin.prototype.updateRolesTitles = function() {
    [ $(pfc.element).find('div.pfc-role-admin'), $(pfc.element).find('div.pfc-role-user') ].forEach(function (item, index) {
      if (item.find('li').length == 0) {
        item.find('.role-title').hide();
      } else {
        item.find('.role-title').show();
      }
    });
  }

  /**
    * Clear the user list
    */
  Plugin.prototype.clearUserList = function() {
    $(pfc.element).find('li.user').remove();
    pfc.updateRolesTitles();
    return true;
  }

  /**
    * Appends a message to the interface 
    */
  Plugin.prototype.appendMessage = function(msg) {

    // default values
    msg.name      = (msg.name != undefined) ? msg.name : '';
    msg.message   = (msg.message != undefined) ? msg.message : '';
    msg.timestamp = (msg.timestamp != undefined) ? msg.timestamp : Math.round(new Date().getTime() / 1000);
    msg.date      = new Date(msg.timestamp*1000).toLocaleTimeString();
    
    var groupmsg_dom = $(pfc.element).find('.pfc-messages .messages-group:last');

    if (groupmsg_dom.attr('data-from') != msg.name) {
      var html = $('<div class="messages-group" data-stamp="" data-from="">'
//          +'            <div class="avatar"><img src="http://www.gravatar.com/avatar/00000000000000000000000000000001?d=wavatar&s=30" alt="" /></div>'
        +'            <div class="avatar"><div style="width:30px; height: 30px; background-color: #DDD;"></div></div>'
        +'            <div class="date"></div>'
        +'            <div class="name"></div>'
        +'          </div>');
        
      // fill the html fragment
      html.find('.name').text(msg.name);
      html.attr('data-from', msg.name);
      html.find('.date').text(msg.date);
      html.attr('data-stamp', msg.timestamp);
        
      // add a new message group
      $(pfc.element).find('.pfc-messages').append(html);
      groupmsg_dom = html;
    }

    // add the message to the latest active message group
    var message = $('<div class="message"></div>').html(nl2br(msg.message));
    groupmsg_dom.append(message);
    return message;
  }


  /**
    * Check if the backlink is in the page
    */
  Plugin.prototype.hasBacklink = function() {
    var backlink = $('a[href="http://www.phpfreechat.net"]').length;
    if (!backlink) {
      $(pfc.element).html(
        '<div class="pfc-backlink">'
        +'<p>Please insert the phpfreechat backlink somewhere in your HTML in order to load the chat. The attended backlink is:</p>'
        +'<pre>'
        +$('<div/>').text('<a href="http://www.phpfreechat.net">phpFreeChat: simple Web chat</a>').html()
        +'</pre>'
        +'</div>'
      );
      return false;
    }
    return true;
  }


  Plugin.prototype.loadHTML = function () {
    // load chat HTML
    $(pfc.element).html(
       '      <div class="pfc-content">'
      +'        <div class="pfc-tabs">'
      +'          <ul>'
      +(pfc.options.loadTestData ? ''
      +'            <li class="channel active">'
      +'              <div class="icon"></div>'
      +'              <div class="name">Channel 1</div>'
      +'              <div class="close"></div>'
      +'            </li>'
      +'            <li class="channel">'
      +'              <div class="icon"></div>'
      +'              <div class="name">Channel 2</div>'
      +'              <div class="close"></div>'
      +'            </li>'
      +'            <li class="pm">'
      +'              <div class="icon"></div>'
      +'              <div class="name">admin</div>'
      +'              <div class="close"></div>'
      +'            </li>'
      : '')
      +'            <li class="new-tab">'
      +'              <div class="icon"></div>'
      +'            </li>'
      +'          </ul>'
      +'        </div>'
      +''
      +'        <div class="pfc-topic">'
      +'          <p><span class="pfc-topic-label">Topic:</span> <span class="pfc-topic-value">no topic for this channel</span></p>'
      +'        </div>'
      +''
      +'        <div class="pfc-messages">'
      +(pfc.options.loadTestData ? ''
      +'          <div class="messages-group" data-stamp="1336815502" data-from="kerphi">'
      +'            <div class="avatar"><img src="http://www.gravatar.com/avatar/ae5979732c49cae7b741294a1d3a8682?d=wavatar&s=30" alt="" /></div>'
      +'            <div class="date">11:38:21</div>'
      +'            <div class="name">kerphi</div>'
      +'            <div class="message">123</div>'
      +'            <div class="message">456</div>'
      +'          </div>'
      +'          <div class="messages-group" data-stamp="1336815503" data-from="admin">'
      +'            <div class="avatar"><img src="http://www.gravatar.com/avatar/00000000000000000000000000000001?d=wavatar&s=30" alt="" /></div>'
      +'            <div class="date">11:38:22</div>'
      +'            <div class="name">admin</div>'
      +'            <div class="message">Hello</div>'
      +'            <div class="message">World</div>'
      +'            <div class="message">!</div>'
      +'          </div>'
      : '')
      +'        </div>'
      +''
      +'        <div class="pfc-users">'
      +'          <div class="pfc-role-admin">'
      +'            <p class="role-title">Administrators</p>'
      +'            <ul>'
      +(pfc.options.loadTestData ? ''
      +'              <li class="first">'
      +'                <div class="status st-active"></div>'
      +'                <div class="name">admin</div>'
      +'                <div class="avatar"><img src="http://www.gravatar.com/avatar/00000000000000000000000000000001?d=wavatar&s=20" alt="" /></div>'
      +'              </li>'
      : '')
      +'            </ul>'
      +'          </div>'
      +'          <div class="pfc-role-user">'
      +'            <p class="role-title">Users</p>'
      +'            <ul>'
      +(pfc.options.loadTestData ? ''
      +'              <li class="first">'
      +'                <div class="status st-active"></div>'
      +'                <div class="name myself">kerphi</div>'
      +'                <div class="avatar"><img src="http://www.gravatar.com/avatar/ae5979732c49cae7b741294a1d3a8682?d=wavatar&s=20" alt="" /></div>'
      +'              </li>'
      +'              <li>'
      +'                <div class="status st-inactive"></div>'
      +'                <div class="name">Stéphane Gully</div>'
      +'                <div class="avatar"><img src="http://www.gravatar.com/avatar/00000000000000000000000000000002?d=wavatar&s=20" alt="" /></div>'
      +'              </li>'
      : '')
      +'            </ul>'
      +'          </div>'
      +'        </div>'
      +''
      +'        <div class="pfc-footer">'
      +'          <p class="logo"><a href="http://www.phpfreechat.net">Powered by phpFreeChat</a></p>'
      //+'          <p class="ping">150ms</p>'
      +'          <ul>'
      //+'            <li><div class="logout-btn"></div></li>'
      //+'            <li><div class="smiley-btn" title="Not implemented"></div></li>'
      //+'            <li><div class="sound-btn" title="Not implemented"></div></li>'
      //+'            <li><div class="online-btn"></div></li>'
      +'          </ul>'
      +'        </div>'
      +''
      +'        <div class="pfc-compose">'
      +'          <textarea data-to="channel|xxx"></textarea>'
      +'        </div>'
      +''
      +'        <div class="pfc-modal-overlay"></div>'
      +'        <div class="pfc-modal-box"></div>'
      +'      </div>'
    );

    // once html is loaded init modalbox
    // because modalbox is hooked in pfc's html
    modalbox.init();

    // call the loaded callback when finished 
    if (pfc.options.loaded) {
      pfc.options.loaded(pfc);
    }
    // trigger the pfc-loaded event when finished 
    setTimeout(function () { $(pfc.element).trigger('pfc-loaded', [ pfc ]) }, 0);
  };

  Plugin.prototype.tryToLogin = function (credentials, callback) {
    var h = credentials ? { 'Pfc-Authorization': 'Basic '+$.base64.encode(credentials.login + ':' + credentials.password) } : {};
    var d = credentials ? {'email': credentials.email} : null;
    $.ajax({
      type: 'GET',
      url:  pfc.options.serverUrl + '/auth',
      headers: h,
      data: d,
    }).done(function (userdata) {
      pfc.appendUser(userdata);
      callback ? callback(null, userdata) : null;
    }).error(function (err) {
      pfc.showAuthForm(credentials ? err.statusText : null);
      callback ? callback(err) : null;
    });
  };

  Plugin.prototype.tryToLogout = function (callback) {
    $.ajax({
      type: 'DELETE',
      url:  pfc.options.serverUrl + '/auth',
    }).done(function (userdata) {
      userdata ? pfc.removeUser(userdata) : null;
      callback ? callback(null) : null;
    }).error(function (err) {
      callback ? callback(err) : null;
    });
  };
  
  Plugin.prototype.showAuthForm = function (err) {
    modalbox.open(
        '<form>'
      +'  <input type="text" name="login" placeholder="Login"/><br/>'
      //+'  <input type="text" name="password" placeholder="Password"/><br/>'
      +'  <input type="text" name="email" placeholder="Email"/><br/>'
      +'  <input type="submit" name="submit" value="Sign in" />'
      +(err ? '<p>'+err+'</p>' : '')
      +'</form>'
    ).submit(function () {
      var login    = $(this).find('[name=login]').attr('value');
      var password = $(this).find('[name=password]').attr('value');
      var email    = $(this).find('[name=email]').attr('value');
      if (!login) return false;
      
      pfc.tryToLogin({'login': login, 'password': password, 'email': email});
      modalbox.close(true);
      
      return false;
    }).find('[name=login]').focus();
  };

  
  // multiple instantiations are forbidden
  $.fn[pluginName] = function ( options ) {
      return this.each(function () {
          if (!$.data(this, 'plugin_' + pluginName)) {
              $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
          }
      });
  }

  /**
   * nl2br php equivalent function
   */
  function nl2br(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  }
  
  /**
   * MD5 algorithme
   */
  function md5(s) {function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]|(G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()};
  
  /**
   * Base64 algorithme
   * https://github.com/carlo/jquery-base64
   */
  jQuery.base64=(function($){var _PADCHAR="=",_ALPHA="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",_VERSION="1.0";function _getbyte64(s,i){var idx=_ALPHA.indexOf(s.charAt(i));if(idx===-1){throw"Cannot decode base64"}return idx}function _decode(s){var pads=0,i,b10,imax=s.length,x=[];s=String(s);if(imax===0){return s}if(imax%4!==0){throw"Cannot decode base64"}if(s.charAt(imax-1)===_PADCHAR){pads=1;if(s.charAt(imax-2)===_PADCHAR){pads=2}imax-=4}for(i=0;i<imax;i+=4){b10=(_getbyte64(s,i)<<18)|(_getbyte64(s,i+1)<<12)|(_getbyte64(s,i+2)<<6)|_getbyte64(s,i+3);x.push(String.fromCharCode(b10>>16,(b10>>8)&255,b10&255))}switch(pads){case 1:b10=(_getbyte64(s,i)<<18)|(_getbyte64(s,i+1)<<12)|(_getbyte64(s,i+2)<<6);x.push(String.fromCharCode(b10>>16,(b10>>8)&255));break;case 2:b10=(_getbyte64(s,i)<<18)|(_getbyte64(s,i+1)<<12);x.push(String.fromCharCode(b10>>16));break}return x.join("")}function _getbyte(s,i){var x=s.charCodeAt(i);if(x>255){throw"INVALID_CHARACTER_ERR: DOM Exception 5"}return x}function _encode(s){if(arguments.length!==1){throw"SyntaxError: exactly one argument required"}s=String(s);var i,b10,x=[],imax=s.length-s.length%3;if(s.length===0){return s}for(i=0;i<imax;i+=3){b10=(_getbyte(s,i)<<16)|(_getbyte(s,i+1)<<8)|_getbyte(s,i+2);x.push(_ALPHA.charAt(b10>>18));x.push(_ALPHA.charAt((b10>>12)&63));x.push(_ALPHA.charAt((b10>>6)&63));x.push(_ALPHA.charAt(b10&63))}switch(s.length-imax){case 1:b10=_getbyte(s,i)<<16;x.push(_ALPHA.charAt(b10>>18)+_ALPHA.charAt((b10>>12)&63)+_PADCHAR+_PADCHAR);break;case 2:b10=(_getbyte(s,i)<<16)|(_getbyte(s,i+1)<<8);x.push(_ALPHA.charAt(b10>>18)+_ALPHA.charAt((b10>>12)&63)+_ALPHA.charAt((b10>>6)&63)+_PADCHAR);break}return x.join("")}return{decode:_decode,encode:_encode,VERSION:_VERSION}}(jQuery));

  /**
   * PFC's Modal box
   * Todo: make it a jquery plugin
   */
  var modalbox = {
    open: function (html) {
      html = $(html);
      $('div.pfc-modal-box *').remove();
      $('div.pfc-modal-box').append(html).fadeIn();
      $('div.pfc-modal-overlay').fadeIn('fast');
      $(window).trigger('resize'); // force new width calculation
      return html;
    },
    close: function (now) {
      if (now) {
        $('div.pfc-modal-box').hide();
        $('div.pfc-modal-overlay').hide();
      } else {
        $('div.pfc-modal-box').fadeOut();
        $('div.pfc-modal-overlay').fadeOut('fast');
      }
    },
    init: function () {
      $(window).resize(function setModalBoxPosition() {
        var mb = $('div.pfc-modal-box');
        var mo = $('div.pfc-modal-overlay');
        mb.css({
          left: (mo.outerWidth(true)-mb.outerWidth(true))/2,
          top:  (mo.outerHeight(true)-mb.outerHeight(true))/2
        });
      }).trigger('resize');
    }
  }

}(jQuery, window));