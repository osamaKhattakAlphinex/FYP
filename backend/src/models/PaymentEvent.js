const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// The audit trail of one payment — one row per status change, written only by
// paymentService.transition() (and once on creation, fromStatus null). Same
// role as ApplicationStatusHistory / ProgressStatusHistory.
const EVENT_SOURCES = ['user', 'webhook', 'system'];

class PaymentEvent extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

PaymentEvent.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        paymentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'payments', key: 'id' },
            onDelete: 'CASCADE'
        },
        fromStatus: { type: DataTypes.STRING(20), allowNull: true },
        toStatus: { type: DataTypes.STRING(20), allowNull: false },
        source: { type: DataTypes.ENUM(...EVENT_SOURCES), allowNull: false, defaultValue: 'user' },
        actorUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        actorRole: { type: DataTypes.STRING(20), allowNull: true },
        note: { type: DataTypes.STRING(500), allowNull: true },
        // The gateway's event id for webhook-driven changes. Unique, so a
        // replayed webhook can never be applied twice (NULLs do not collide).
        providerEventId: { type: DataTypes.STRING(255), allowNull: true }
    },
    {
        sequelize,
        modelName: 'PaymentEvent',
        tableName: 'payment_events',
        timestamps: true,
        updatedAt: false,
        indexes: [
            { fields: ['paymentId'] },
            { unique: true, fields: ['providerEventId'] }
        ]
    }
);

PaymentEvent.SOURCES = EVENT_SOURCES;

module.exports = PaymentEvent;
