module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    }
  }, {})

  Attendance.associate = function(models) {
    Attendance.belongsTo(models.Player, { foreignKey: 'player_id' })
    Attendance.belongsTo(models.Event, { foreignKey: 'event_id' })
  }

  return Attendance
}