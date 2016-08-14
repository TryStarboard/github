'use strict'

const {stringify} = require('querystring')
const {promisifyAll} = require('bluebird')
const {wrap} = require('co')
const github = require('octonode')
const rp = require('request-promise')

promisifyAll(Object.getPrototypeOf(github.client()), {multiArgs: true})

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
    secret: opts.clientSecret
  })

  function createLoginUrl() {
    const queryStr = stringify({
      client_id: opts.clientId,
      redirect_uri: opts.redirectUri,
      state: Date.now()
    })
    return `https://github.com/login/oauth/authorize?${queryStr}`
  }

  const handleLoginCallback = wrap(function *({code, state}) {
    const {access_token: accessToken} = yield rp({
      method: 'POST',
      uri: 'https://github.com/login/oauth/access_token',
      body: {
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri: opts.redirectUri,
        code,
        state
      },
      json: true
    })

    return accessToken
  })

  // { login: 'd6u',
  //   id: 1234,
  //   avatar_url: 'https://avatars.githubusercontent.com/xxxxxxx',
  //   gravatar_id: '',
  //   url: 'https://api.github.com/users/xyz',
  //   html_url: 'https://github.com/xyz',
  //   followers_url: 'https://api.github.com/users/xyz/followers',
  //   following_url: 'https://api.github.com/users/xyz/following{/other_user}',
  //   gists_url: 'https://api.github.com/users/xyz/gists{/gist_id}',
  //   starred_url: 'https://api.github.com/users/xyz/starred{/owner}{/repo}',
  //   subscriptions_url: 'https://api.github.com/users/xyz/subscriptions',
  //   organizations_url: 'https://api.github.com/users/xyz/orgs',
  //   repos_url: 'https://api.github.com/users/xyz/repos',
  //   events_url: 'https://api.github.com/users/xyz/events{/privacy}',
  //   received_events_url: 'https://api.github.com/users/xyz/received_events',
  //   type: 'User',
  //   site_admin: false,
  //   name: 'XY Z',
  //   company: null,
  //   blog: 'http://xxx',
  //   location: null,
  //   email: 'xxx@email.com',
  //   hireable: true,
  //   bio: null,
  //   public_repos: 123,
  //   public_gists: 123,
  //   followers: 123,
  //   following: 123,
  //   created_at: '2012-08-14T22:42:49Z',
  //   updated_at: '2016-02-20T03:02:44Z' }

  const fetchUserProfile = wrap(function *(accessToken) {
    const client = github.client(accessToken)
    const [, profile] = yield client.getAsync('/user')
    return profile
  })

  return {
    client: github,
    createLoginUrl,
    handleLoginCallback,
    fetchUserProfile
  }
}

module.exports = {
  createClient
}
