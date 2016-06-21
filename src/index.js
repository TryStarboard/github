'use strict';

const {stringify} = require('querystring');
const {promisifyAll} = require('bluebird');
const {wrap} = require('co');
const github = require('octonode');
const rp = require('request-promise');

promisifyAll(Object.getPrototypeOf(github.client()), {multiArgs: true});

/**
 * @param  {Object} opts
 * @param  {Object} opts.clientId
 * @param  {Object} opts.clientSecret
 * @param  {Object} opts.redirectUri
 * @return {Object}
 */
function createClient(opts) {
  github.auth.config({
    id: opts.clientId,
    secret: opts.clientSecret,
  });

  function createLoginUrl() {
    const queryStr = stringify({
      client_id: opts.clientId,
      redirect_uri: opts.redirectUri,
      state: Date.now(),
    });
    return `https://github.com/login/oauth/authorize?${queryStr}`;
  }

  const handleLoginCallback = wrap(function *({code, state}) {
    const {access_token} = yield rp({
      method: 'POST',
      uri: 'https://github.com/login/oauth/access_token',
      body: {
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri: opts.redirectUri,
        code,
        state,
      },
      json: true,
    });

    return access_token;
  });

  return {
    client: github,
    createLoginUrl,
    handleLoginCallback,
  };
}

module.exports = {
  createClient,
};
