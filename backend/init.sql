-- --------------------------------------------------------
-- SCRIPT D'INITIALISATION DE LA BASE DE DONNÉES MARIADB
-- Application E-Commerce Pièces Automobiles
-- --------------------------------------------------------

DROP DATABASE IF EXISTS auto_parts_db;
CREATE DATABASE IF NOT EXISTS auto_parts_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auto_parts_db;

-- --------------------------------------------------------
-- Structure de la table PRODUCTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS PRODUCTS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reference VARCHAR(100) NULL,
    part_brand VARCHAR(100) NULL,
    brand VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    car_model VARCHAR(100) NOT NULL,
    year VARCHAR(50) NOT NULL,
    motorisation VARCHAR(100) DEFAULT 'Toutes motorisations',
    category VARCHAR(100) DEFAULT '0 Accessoires/Infodivert./divers',
    low_stock_threshold INT NOT NULL DEFAULT 5,
    stock INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Structure de la table PRODUCT_COMPATIBILITIES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS PRODUCT_COMPATIBILITIES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    car_model VARCHAR(100) NOT NULL,
    year VARCHAR(50) NOT NULL,
    motorisation VARCHAR(100) DEFAULT 'Toutes motorisations',
    CONSTRAINT fk_compat_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Structure de la table CUSTOMERS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS CUSTOMERS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Structure de la table ORDERS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS ORDERS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'rejected', 'delivered') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES CUSTOMERS(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Structure de la table ORDER_ITEMS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES ORDERS(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Structure de la table APP_SETTINGS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS APP_SETTINGS (
    key_name VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO APP_SETTINGS (key_name, value) VALUES ('whatsapp_number', '213555123456')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- --------------------------------------------------------
-- Fin du script : la base de données est vide et prête.
-- --------------------------------------------------------
