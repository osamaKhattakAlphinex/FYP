const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// Where a student wants to be paid. Only a masked form of the account is kept:
// the full account number / wallet number / PayPal address is validated on
// the way in and then discarded. In a real deployment the payout destination
// is registered with the payment gateway (e.g. a Stripe Connect account), and
// the platform only needs to know *that* one exists and how to show it.
const PAYOUT_METHODS = ['bank_transfer', 'jazzcash', 'easypaisa', 'paypal'];
const MOBILE_WALLETS = ['jazzcash', 'easypaisa'];

const METHOD_LABELS = {
    bank_transfer: 'Bank transfer',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    paypal: 'PayPal'
};

const MASK = '••••';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

const clean = (v) => (v == null ? '' : String(v).trim());

// `•••• 4821` — the last four characters only.
const maskAccount = (account) => `${MASK} ${String(account).slice(-4)}`;

// `a•••@gmail.com` — the first character of the local part and the domain.
const maskEmail = (email) => {
    const [local, domain] = String(email).split('@');
    return `${local.charAt(0)}•••@${domain}`;
};

class StudentPayoutMethod extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        values.methodLabel = METHOD_LABELS[values.method] || values.method;
        return values;
    }

    // Pure. Validates the raw input and returns only what may be stored.
    //   input: { method, accountTitle, account, bankName }
    //   → { errors: [{ field, message }], value: { method, accountTitle, accountMasked, bankName } | null }
    // Error messages never repeat the account itself.
    static validateInput(input = {}) {
        const errors = [];
        const method = clean(input.method);
        const accountTitle = clean(input.accountTitle);
        const bankName = clean(input.bankName);
        const raw = clean(input.account);

        if (!PAYOUT_METHODS.includes(method)) {
            errors.push({ field: 'method', message: `Payout method must be one of: ${PAYOUT_METHODS.join(', ')}` });
        }
        if (accountTitle.length < 2 || accountTitle.length > 150) {
            errors.push({ field: 'accountTitle', message: 'Account title must be 2-150 characters' });
        }

        let accountMasked = null;
        if (method === 'bank_transfer') {
            // Account number or IBAN: spaces and dashes are formatting only.
            const account = raw.replace(/[\s-]/g, '').toUpperCase();
            if (!/^[A-Z0-9]{6,34}$/.test(account)) {
                errors.push({ field: 'account', message: 'Enter a bank account number or IBAN of 6-34 letters and digits' });
            } else {
                accountMasked = maskAccount(account);
            }
            if (bankName.length < 2 || bankName.length > 150) {
                errors.push({ field: 'bankName', message: 'Bank name must be 2-150 characters' });
            }
        } else if (MOBILE_WALLETS.includes(method)) {
            // Pakistani mobile wallet: 11 digits starting 03 (03XX-XXXXXXX).
            const account = raw.replace(/[\s-]/g, '');
            if (!/^03\d{9}$/.test(account)) {
                errors.push({ field: 'account', message: 'Enter the 11-digit mobile wallet number, starting 03' });
            } else {
                accountMasked = maskAccount(account);
            }
        } else if (method === 'paypal') {
            const email = raw.toLowerCase();
            if (email.length > 254 || !EMAIL_RE.test(email)) {
                errors.push({ field: 'account', message: 'Enter the email address of your PayPal account' });
            } else {
                accountMasked = maskEmail(email);
            }
        }

        if (errors.length > 0) return { errors, value: null };
        return {
            errors,
            value: {
                method,
                accountTitle,
                accountMasked,
                bankName: method === 'bank_transfer' ? bankName : null
            }
        };
    }
}

StudentPayoutMethod.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // One per student; unique declared once in `indexes`.
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        method: { type: DataTypes.ENUM(...PAYOUT_METHODS), allowNull: false },
        accountTitle: { type: DataTypes.STRING(150), allowNull: false },
        accountMasked: { type: DataTypes.STRING(64), allowNull: false },
        bankName: { type: DataTypes.STRING(150), allowNull: true }
    },
    {
        sequelize,
        modelName: 'StudentPayoutMethod',
        tableName: 'student_payout_methods',
        timestamps: true,
        indexes: [{ unique: true, fields: ['studentId'] }]
    }
);

StudentPayoutMethod.METHODS = PAYOUT_METHODS;
StudentPayoutMethod.METHOD_LABELS = METHOD_LABELS;
StudentPayoutMethod.maskAccount = maskAccount;
StudentPayoutMethod.maskEmail = maskEmail;

module.exports = StudentPayoutMethod;
