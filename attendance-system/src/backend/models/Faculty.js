const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Faculty extends Model {}

Faculty.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('faculty', 'admin'),
        defaultValue: 'faculty'
    }
}, {
    sequelize,
    modelName: 'Faculty',
    tableName: 'faculty',
    timestamps: true
});

module.exports = Faculty;