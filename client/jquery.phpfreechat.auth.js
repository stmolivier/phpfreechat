/**
 * phpfreechat's authentication related functions
 */
var phpFreeChat = (function (pfc, $, window, undefined) {

  /**
   * Login the user
   * Shows a popup if no credentials are provided
   */
  pfc.login = function (credentials, callback) {
    var h = credentials ? { 'Pfc-Authorization': 'Basic '+pfc.base64.encode(credentials.login + ':' + credentials.password) } : {};
    var d = credentials ? {'email': credentials.email} : null;
    $.ajax({
      type: 'GET',
      url:  pfc.options.serverUrl + '/auth',
      headers: h,
      data: d,
    }).done(function (userdata) {
      $(pfc.element).trigger('pfc-login', [ pfc, userdata ]);
      callback ? callback(null, userdata) : null;
    }).error(function (err) {
      pfc.showAuthForm(credentials ? err.statusText : null);
      callback ? callback(err) : null;
    });
  };

  /**
   * Logout the user from the chat
   */
  pfc.logout = function (callback) {
    $.ajax({
      type: 'DELETE',
      url:  pfc.options.serverUrl + '/auth',
    }).done(function (userdata) {
      $(pfc.element).trigger('pfc-logout', [ pfc, userdata ]);
      callback ? callback(null, userdata) : null;
    }).error(function (err) {
      callback ? callback(err) : null;
    });
  };
  
  /**
   * Open the authentication dialog box (login, email, password) 
   * msg: message to display
   */
  pfc.showAuthForm = function (msg) {
    pfc.modalbox.open(
        '<form>'
      +'  <input type="text" name="login" placeholder="Login"/><br/>'
      //+'  <input type="text" name="password" placeholder="Password"/><br/>'
      +'  <input type="text" name="email" placeholder="Email"/><br/>'
      +'  <input type="submit" name="submit" value="Sign in" />'
      +(msg ? '<p>'+msg+'</p>' : '')
      +'</form>'
    ).submit(function () {
      var login    = $(this).find('[name=login]').attr('value');
      var password = $(this).find('[name=password]').attr('value');
      var email    = $(this).find('[name=email]').attr('value');
      if (!login) return false;
      
      pfc.login({'login': login, 'password': password, 'email': email});
      pfc.modalbox.close(true);
      
      return false;
    }).find('[name=login]').focus();
  };

  return pfc;
}(phpFreeChat || {}, jQuery, window));