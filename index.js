// เพิ่มหน้า logs ที่แสดงผ่าน logs.ejs และเพิ่มการแสดงชื่อ users ที่ทำใน database (ตาราง stock_transactions)
// path อยู่ล่างสุดเลย
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const session = require("express-session");

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "gearhub_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  }),
);

const dbPath = path.join(__dirname, "hardwarehouse.db");
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Database connection error:", err.message);
  else {
    console.log("Connected to database.");
  }
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect("/login");
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect("/login");
    if (roles.length && !roles.includes(req.session.user.role)) {
      return res.status(403).send("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }
    next();
  };
};

function logTransaction(productId, productName, type, qty, note, userId) {
  const userSql = "SELECT full_name FROM users WHERE user_id = ?";

  db.get(userSql, [userId], (err, user) => {
    const userName = user ? user.full_name : "Unknown";

    db.get(
      "SELECT MAX(transaction_id) as maxId FROM stock_transactions",
      (err, row) => {
        const nextId = row && row.maxId ? row.maxId + 1 : 1;

        const sql = `
        INSERT INTO stock_transactions
        (transaction_id, product_id, product_name, user_id, user_name, transaction_type, quantity, reference_note, transaction_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
        `;

        db.run(sql, [
          nextId,
          productId,
          productName,
          userId,
          userName,
          type,
          qty,
          note,
        ]);
      },
    );
  });
}

// แจ้งเตือน
function getLowStockProducts(callback) {
  const sql = `
        SELECT product_id, product_name, stock
        FROM products
        WHERE stock <= 10
        ORDER BY stock ASC
    `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      callback([]);
    } else {
      callback(rows);
    }
  });
}

app.use((req, res, next) => {
  const sql = `
    SELECT 
      p.product_id,
      p.product_name,
      s.warehouse_qty AS stock
    FROM products p
    LEFT JOIN stock s ON p.product_id = s.product_id
    WHERE s.warehouse_qty <= 10
    ORDER BY s.warehouse_qty ASC
  `;

  db.all(sql, [], (err, rows) => {
    res.locals.lowStockProducts = rows || [];
    res.locals.lowStockCount = rows ? rows.length : 0;
    next();
  });
});

// --- Auth Routes ---
app.get("/login", (req, res) => {
  res.render("logins", { title: "Login", error: null });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err) return res.status(500).send("Database error");
      if (user) {
        req.session.user = user;
        res.redirect("/");
      } else {
        res.render("logins", {
          title: "Login",
          error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        });
      }
    },
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.redirect("/");
    }
    res.clearCookie("gearhub_secret_key");
    res.redirect("/login");
  });
});

// --- หน้า Dashboard พร้อมระบบ ---
app.get("/", isAuthenticated, (req, res) => {
  const queries = {
    total: "SELECT COUNT(*) as count FROM products",
    received:
      "SELECT SUM(quantity) as count FROM stock_transactions WHERE transaction_type = 'receive' AND date(transaction_date) = date('now', 'localtime')",
    dispatched:
      "SELECT SUM(quantity) as count FROM stock_transactions WHERE transaction_type = 'dispatch' AND date(transaction_date) = date('now', 'localtime')",
    lowStock: "SELECT COUNT(*) as count FROM stock WHERE warehouse_qty <= 5",
    categoryStats: `SELECT c.category_name, SUM(COALESCE(s.warehouse_qty, 0)) as total_stock 
                        FROM categories c 
                        LEFT JOIN products p ON c.category_id = p.category_id 
                        LEFT JOIN stock s ON p.product_id = s.product_id 
                        GROUP BY c.category_id`,
    recentLogs: `SELECT 
  transaction_id,
  product_name,
  product_id,
  transaction_type,
  quantity,
  transaction_date
FROM stock_transactions
ORDER BY transaction_id DESC
LIMIT 10`,
    totalInventory: "SELECT SUM(warehouse_qty) as total FROM stock",
  };

  db.get(queries.total, (err, total) => {
    db.get(queries.received, (err, received) => {
      db.get(queries.dispatched, (err, dispatched) => {
        db.get(queries.lowStock, (err, low) => {
          db.get(queries.totalInventory, (err, inv) => {
            db.all(queries.categoryStats, (err, catStats) => {
              db.all(queries.recentLogs, (err, logs) => {
                const stats = {
                  total: total ? total.count : 0,
                  received: received ? received.count || 0 : 0,
                  dispatched: dispatched ? dispatched.count || 0 : 0,
                  lowStock: low ? low.count : 0,
                };

                const totalInventoryCount = inv ? inv.total || 0 : 0;
                res.render("dashboard", {
                  title: "แดชบอร์ด",
                  stats,
                  logs: logs || [],
                  catStats: catStats || [],
                  totalInventory: totalInventoryCount,
                  currentRoute: "/",
                });
              });
            });
          });
        });
      });
    });
  });
});

// --- หน้า Product (แสดงรายการสินค้า) ---
app.get("/products", authorize(["admin", "warehouse", "sales"]), (req, res) => {
  const search = req.query.search || "";
  const categoryId = req.query.category || "";

  const sort = req.query.sort || "product_id";
  const order = req.query.order === "desc" ? "DESC" : "ASC";
  db.all(
    "SELECT category_id, category_name FROM categories ORDER BY category_id ASC",
    [],
    (err, categories) => {
      let sql = `SELECT p.product_id, p.product_name, p.price, c.category_name, COALESCE(s.warehouse_qty, 0) AS stock 
                   FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
                   LEFT JOIN stock s ON p.product_id = s.product_id WHERE 1=1`;
      let params = [];
      if (search) {
        sql += " AND p.product_name LIKE ?";
        params.push("%" + search + "%");
      }
      if (categoryId) {
        sql += " AND p.category_id = ?";
        params.push(categoryId);
      }
      const validSort = {
        id: "p.product_id",
        name: "p.product_name",
        category: "c.category_name",
        stock: "s.warehouse_qty",
        price: "p.price",
      };

      const sortColumn = validSort[sort] || "p.product_id";

      sql += ` ORDER BY ${sortColumn} ${order}`;
      db.all(sql, params, (err, rows) => {
        res.render("products", {
          title: "สินค้าทั้งหมด",
          products: rows,
          categories,
          searchQuery: search,
          selectedCategory: categoryId,
          currentRoute: "/products",
          sort: sort,
          order: order,
        });
      });
    },
  );
});

app.post("/add-product", authorize(["admin", "warehouse"]), (req, res) => {
  const { name, category_id, stock, price, description } = req.body;
  db.get("SELECT MAX(product_id) as maxId FROM products", (err, row) => {
    const nextProductId = row && row.maxId ? row.maxId + 1 : 1;

    db.run(
      `INSERT INTO products (product_id, product_name, category_id, price, description) VALUES (?, ?, ?, ?, ?)`,
      [nextProductId, name, category_id, price, description],
      function (err) {
        db.get("SELECT MAX(stock_id) as maxStockId FROM stock", (err, sRow) => {
          const nextStockId = sRow && sRow.maxStockId ? sRow.maxStockId + 1 : 1;
          db.run(
            `INSERT INTO stock (stock_id, product_id, warehouse_qty) VALUES (?, ?, ?)`,
            [nextStockId, nextProductId, stock],
            function (err) {
              const userId = req.session.user.user_id;
              logTransaction(
                nextProductId,
                name,
                "add",
                stock,
                `เพิ่มสินค้าใหม่: ${name}`,
                userId,
              );
              res.redirect("/products");
            },
          );
        });
      },
    );
  });
});

app.post("/edit-product/:id", authorize(["admin", "warehouse"]), (req, res) => {
  const productId = req.params.id;
  const { name, category_id, stock, price, description } = req.body;

  db.get(
    `SELECT p.product_name,p.category_id,p.price,p.description,s.warehouse_qty
     FROM products p
     LEFT JOIN stock s ON p.product_id = s.product_id
     WHERE p.product_id = ?`,
    [productId],
    (err, oldData) => {
      let changes = [];

      if (oldData.product_name !== name)
        changes.push(`ชื่อ: ${oldData.product_name} → ${name}`);

      if (oldData.category_id != category_id) changes.push(`เปลี่ยนหมวดหมู่`);

      if (oldData.price != price)
        changes.push(`ราคา: ${oldData.price} → ${price}`);

      if (oldData.description !== description) changes.push(`แก้ไขคำอธิบาย`);

      if (oldData.warehouse_qty != stock)
        changes.push(`จำนวน: ${oldData.warehouse_qty} → ${stock}`);

      const note =
        changes.length > 0
          ? "แก้ไขสินค้า: " + changes.join(", ")
          : "แก้ไขสินค้า";

      db.run(
        `UPDATE products SET product_name = ?, category_id = ?, price = ?, description = ? WHERE product_id = ?`,
        [name, category_id, price, description, productId],
        () => {
          db.run(
            `UPDATE stock SET warehouse_qty = ? WHERE product_id = ?`,
            [stock, productId],
            () => {
              const userId = req.session.user.user_id;

              logTransaction(productId, name, "adjust", stock, note, userId);

              res.redirect("/products");
            },
          );
        },
      );
    },
  );
});

app.post(
  "/delete-product/:id",
  authorize(["admin", "warehouse"]),
  (req, res) => {
    const productId = req.params.id;
    const userId = req.session.user.user_id;

    db.get(
      `
    SELECT p.product_name, c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    WHERE p.product_id = ?
  `,
      [productId],
      (err, product) => {
        if (err || !product) {
          return res.status(500).send("Product not found");
        }

        const productName = product.product_name;
        const categoryName = product.category_name || "Unknown";

        db.run("DELETE FROM stock WHERE product_id = ?", [productId]);

        db.run(
          "DELETE FROM products WHERE product_id = ?",
          [productId],
          (err) => {
            if (err) {
              return res.status(500).send("Delete error");
            }

            logTransaction(
              productId,
              productName,
              "delete",
              0,
              `ลบสินค้า (หมวดหมู่: ${categoryName})`,
              userId,
            );

            res.redirect("/products");
          },
        );
      },
    );
  },
);

app.get(
  "/product/view/:id",
  authorize(["admin", "warehouse", "sales"]),
  (req, res) => {
    const productId = req.params.id;
    const sql = `SELECT p.*, c.category_name, COALESCE(s.warehouse_qty, 0) AS stock 
                 FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
                 LEFT JOIN stock s ON p.product_id = s.product_id WHERE p.product_id = ?`;
    db.get(sql, [productId], (err, product) => {
      res.render("view-product", {
        title: "รายละเอียดสินค้า",
        product,
        currentRoute: "/products",
      });
    });
  },
);

app.get("/product/edit/:id", (req, res) => {
  const productId = req.params.id;
  const sql = `SELECT p.*, COALESCE(s.warehouse_qty, 0) AS stock FROM products p
                 LEFT JOIN stock s ON p.product_id = s.product_id WHERE p.product_id = ?`;
  db.get(sql, [productId], (err, product) => {
    db.all(
      "SELECT category_id, category_name FROM categories ORDER BY category_name ASC",
      [],
      (err, categories) => {
        res.render("edit-product", {
          title: "แก้ไขข้อมูลสินค้า",
          product,
          categories,
          currentRoute: "/products",
        });
      },
    );
  });
});

// --- หน้า Receive (รับสินค้าเข้าคลัง) ---
app.get("/receive", authorize(["admin", "warehouse"]), (req, res) => {
  db.all(
    "SELECT product_id, product_name FROM products ORDER BY product_name ASC",
    [],
    (err, products) => {
      res.render("receive", {
        title: "รับสินค้าเข้าคลัง",
        products,
        currentRoute: "/receive",
      });
    },
  );
});

app.post("/receive-stock", (req, res) => {
  const { product_id, quantity, supplier } = req.body;

  const updateStockSql = `UPDATE stock SET warehouse_qty = warehouse_qty + ? WHERE product_id = ?`;

  db.run(updateStockSql, [quantity, product_id], function (err) {
    if (err) return res.status(500).send("ไม่สามารถเพิ่มสต็อกได้");

    db.get(
      "SELECT product_name FROM products WHERE product_id = ?",
      [product_id],
      (err, product) => {
        const productName = product ? product.product_name : "Unknown";
        const userId = req.session.user.user_id;

        logTransaction(
          product_id,
          productName,
          "receive",
          quantity,
          `รับสินค้าจาก: ${supplier}`,
          userId,
        );

        return res.redirect("/");
      },
    );
  });
});

// --- หน้า Dispatch (เบิกสินค้า) ---
app.get("/dispatch", authorize(["admin", "sales"]), (req, res) => {
  db.all(
    `SELECT p.product_id, p.product_name, s.warehouse_qty 
            FROM products p JOIN stock s ON p.product_id = s.product_id 
            WHERE s.warehouse_qty > 0 ORDER BY p.product_name ASC`,
    [],
    (err, products) => {
      res.render("dispatch", {
        title: "เบิกสินค้าออกจากคลัง",
        products,
        currentRoute: "/dispatch",
      });
    },
  );
});

app.post("/dispatch-stock", authorize(["admin", "sales"]), (req, res) => {
  const { product_id, quantity, reason } = req.body;

  const user_id = req.session.user.user_id;
  const user_name = req.session.user.full_name;

  db.get(
    "SELECT product_name FROM products WHERE product_id = ?",
    [product_id],
    (err, product) => {
      const productName = product ? product.product_name : "Unknown";

      db.get(
        "SELECT MAX(request_id) as maxId FROM request_from_sales",
        (err, row) => {
          const nextId = row && row.maxId ? row.maxId + 1 : 1;

          const sql = `
          INSERT INTO request_from_sales
          (request_id, product_id, product_name, requested_by, user_name, quantity, status, request_date, reason)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now','localtime'), ?)
          `;

          db.run(
            sql,
            [
              nextId,
              product_id,
              productName,
              user_id,
              user_name,
              quantity,
              reason,
            ],
            (err) => {
              if (err) {
                return res
                  .status(500)
                  .send("Error creating request: " + err.message);
              }

              res.redirect("/dispatch");
            },
          );
        },
      );
    },
  );
});

// --- หน้า Report (สรุปข้อมูล) ---
app.get("/report", authorize(["admin", "warehouse"]), (req, res) => {
  const queries = {
    totalValue: `SELECT SUM(p.price * s.warehouse_qty) as value 
                     FROM products p JOIN stock s ON p.product_id = s.product_id`,
    totalInventory: "SELECT SUM(warehouse_qty) as total FROM stock",
    totalLogs: "SELECT COUNT(*) as count FROM stock_transactions",
    barChart: `SELECT c.category_name, SUM(s.warehouse_qty) as qty 
                   FROM categories c 
                   LEFT JOIN products p ON c.category_id = p.category_id 
                   LEFT JOIN stock s ON p.product_id = s.product_id 
                   GROUP BY c.category_id`,
    pieChart: `SELECT c.category_name, SUM(s.warehouse_qty) as qty 
                   FROM categories c 
                   LEFT JOIN products p ON c.category_id = p.category_id 
                   LEFT JOIN stock s ON p.product_id = s.product_id 
                   GROUP BY c.category_id`,
  };

  db.get(queries.totalValue, (err, val) => {
    db.get(queries.totalInventory, (err, inv) => {
      db.get(queries.totalLogs, (err, logs) => {
        db.all(queries.barChart, (err, barData) => {
          db.all(queries.pieChart, (err, pieData) => {
            res.render("report", {
              title: "รายงานสรุป",
              summary: {
                value: val ? val.value || 0 : 0,
                inventory: inv ? inv.total || 0 : 0,
                logs: logs ? logs.count : 0,
              },
              barData,
              pieData,
              currentRoute: "/report",
            });
          });
        });
      });
    });
  });
});

// --- หน้า Users ---
app.get("/users", authorize(["admin"]), (req, res) => {
  db.all("SELECT * FROM users ORDER BY user_id DESC", [], (err, rows) => {
    res.render("users", {
      title: "จัดการผู้ใช้งาน",
      users: rows || [],
      currentRoute: "/users",
    });
  });
});

app.post("/users/add", authorize(["admin"]), (req, res) => {
  const { username, full_name, role, email, password } = req.body;

  db.get("SELECT MAX(user_id) as maxId FROM users", (err, row) => {
    const nextId = row && row.maxId ? row.maxId + 1 : 1;

    const sql = `INSERT INTO users (user_id, username, full_name, role, email, password) 
                     VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [nextId, username, full_name, role, email, password], (err) => {
      if (err)
        return res.status(500).send("ไม่สามารถเพิ่มผู้ใช้ได้: " + err.message);
      res.redirect("/users");
    });
  });
});

app.post("/users/edit/:id", authorize(["admin"]), (req, res) => {
  const { username, full_name, role } = req.body;
  const { id } = req.params;
  const sql = `UPDATE users SET username = ?, full_name = ?, role = ? WHERE user_id = ?`;

  db.run(sql, [username, full_name, role, id], (err) => {
    if (err) return res.status(500).send("ไม่สามารถแก้ไขข้อมูลได้");
    res.redirect("/users");
  });
});

app.get("/users/delete/:id", authorize(["admin"]), (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM users WHERE user_id = ?", [id], (err) => {
    res.redirect("/users");
  });
});

// --- หน้า Requests ---
app.get("/requests", authorize(["admin", "warehouse"]), (req, res) => {
  const sql = `
SELECT 
  request_id,
  product_id,
  product_name,
  requested_by,
  user_name,
  quantity,
  status,
  request_date,
  reason
FROM request_from_sales
ORDER BY request_date DESC;
`;
  db.all(sql, [], (err, rows) => {
    res.render("requests", {
      title: "คำขอเบิกสินค้า",
      requests: rows,
      currentRoute: "/requests",
    });
  });
});

app.post(
  "/approve-request/:id",
  authorize(["admin", "warehouse"]),
  (req, res) => {
    const requestId = req.params.id;

    db.get(
      "SELECT * FROM request_from_sales WHERE request_id = ?",
      [requestId],
      (err, request) => {
        if (err || !request) {
          return res.status(404).send("ไม่พบรายการคำขอ");
        }

        // ดึงชื่อสินค้าจาก product_id
        db.get(
          "SELECT product_name FROM products WHERE product_id = ?",
          [request.product_id],
          (err, product) => {
            const productName = product ? product.product_name : "Unknown";

            db.get(
              "SELECT warehouse_qty FROM stock WHERE product_id = ?",
              [request.product_id],
              (err, stock) => {
                if (!stock || stock.warehouse_qty < request.quantity) {
                  return res.send("สต็อกไม่พอ");
                }

                db.run(
                  "UPDATE stock SET warehouse_qty = warehouse_qty - ? WHERE product_id = ?",
                  [request.quantity, request.product_id],
                  function (err) {
                    if (err) {
                      return res.status(500).send("ไม่สามารถตัดสต็อกได้");
                    }

                    const userId = req.session.user.user_id;

                    logTransaction(
                      request.product_id,
                      productName,
                      "dispatch",
                      request.quantity,
                      request.reason,
                      userId,
                    );

                    db.run(
                      "UPDATE request_from_sales SET status = 'approved' WHERE request_id = ?",
                      [requestId],
                      () => {
                        res.redirect("/requests");
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  },
);

app.post(
  "/decline-request/:id",
  authorize(["admin", "warehouse"]),
  (req, res) => {
    const requestId = req.params.id;

    db.run(
      "UPDATE request_from_sales SET status = 'rejected' WHERE request_id = ?",
      [requestId],
      (err) => {
        if (err) {
          console.error("DEBUG: ปฏิเสธคำขอ Error ->", err);
          return res.status(500).send("Error: " + err.message);
        }
        res.redirect("/requests");
      },
    );
  },
);

// --- หน้า Logs (ประวัติการทำรายการสต็อก) ---
app.get("/logs", authorize(["admin", "warehouse"]), (req, res) => {
  const search = req.query.search || "";
  const type = req.query.type || "";

  let sql = `
  SELECT 
    t.transaction_id,
    t.product_name,
    t.transaction_type,
    t.quantity,
    t.reference_note,
    t.transaction_date,
    u.full_name AS user_name
  FROM stock_transactions t
  LEFT JOIN users u
  ON t.user_id = u.user_id
  WHERE 1=1
  `;

  let params = [];

  if (search) {
    sql += " AND t.product_name LIKE ?";
    params.push("%" + search + "%");
  }

  if (type) {
    sql += " AND t.transaction_type = ?";
    params.push(type);
  }

  sql += " ORDER BY t.transaction_id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }

    res.render("logs", {
      title: "ประวัติการทำรายการสต็อก",
      logs: rows,
      searchQuery: search,
      selectedType: type,
      currentRoute: "/logs",
    });
  });
});

app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`),
);
