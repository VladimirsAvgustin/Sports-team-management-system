module.exports = (sequelize, DataTypes) => {
  const Player = sequelize.define('Player', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    position: DataTypes.STRING,
    number: DataTypes.INTEGER
  }, {})

  Player.associate = function(models) {
    Player.belongsTo(models.Team, { foreignKey: 'team_id' })
    Player.belongsToMany(models.Event, {
      through: 'Attendance',
      foreignKey: 'player_id'
    })
  }

  return Player
}