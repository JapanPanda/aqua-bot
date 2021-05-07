// Message-Related utils
const createAnnounceEmbed = async (title, description, color = '#00FFFF') => {
  return { embed: { title: title, description: description, color: color } };
};

module.exports = { createAnnounceEmbed };
