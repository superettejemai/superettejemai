// container/Models/template.model.js
module.exports = (sequelize, DataTypes) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    business_name: {
      type: DataTypes.STRING,
      defaultValue: 'Receiptify Corp.'
    },
    address: {
      type: DataTypes.STRING,
      defaultValue: '123 Main St, Anytown, CA 90210'
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: '(555) 123-4567'
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: 'support@receiptify.com'
    },
    website: {
      type: DataTypes.STRING,
      defaultValue: 'www.receiptify.com'
    },
    tax_number: {
      type: DataTypes.STRING,
      defaultValue: 'TAX-ID: 987654321'
    },
    logo_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thank_you_message: {
      type: DataTypes.TEXT,
      defaultValue: 'Merci pour votre achat !'
    },
    return_policy: {
      type: DataTypes.TEXT,
      defaultValue: 'Retours acceptés dans un délai d\'un jour avec le reçu original. Certaines exclusions s\'appliquent.'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'templates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Template;
};