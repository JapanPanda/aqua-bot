const logger = require('./logger');
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyClient = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const refreshSpotifyToken = async () => {
  logger.info(`Refreshing Spotify token.`);
  return spotifyClient
    .clientCredentialsGrant()
    .then((data) => {
      logger.info(`Successfully refreshed Spotify token!`);
      spotifyClient.setAccessToken(data.body['access_token']);
    })
    .catch((err) => {
      logger.error(
        `Something went wrong while refreshing the Spotify Token.\n${err.stack}`
      );
    });
};

refreshSpotifyToken();
setInterval(refreshSpotifyToken, 3.5e6);

module.exports = spotifyClient;
