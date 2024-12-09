import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  serial,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  primaryKey,
  date,
  char,
} from "drizzle-orm/pg-core";

export const addIngredientTable = pgTable(
  "add_ingredient",
  {
    ingredientId: uuid("ingredientid")
      .notNull()
      .references(() => ingredientTable.ingredientId, {
        onDelete: "cascade",
      }),
    customizedOrderId: uuid("customizedorderid")
      .notNull()
      .references(() => customizedOrderTable.customizedOrderId, {
        onDelete: "cascade",
      }),
    amount: integer("amount").notNull()
  },
  (table) => {
    return {
        pk: primaryKey({ columns: [table.ingredientId, table.customizedOrderId] }),
      };
  }
);

export const addItemTable = pgTable(
    "add_item",
    {
      itemId: uuid("itemid")
        .notNull()
        .references(() => itemTable.itemId, {
          onDelete: "cascade",
        }),
      customizedOrderId: uuid("customizedorderid")
        .notNull()
        .references(() => customizedOrderTable.customizedOrderId, {
          onDelete: "cascade",
        }),
      amount: integer("amount").notNull()
    },
    (table) => {
      return {
          pk: primaryKey({ columns: [table.itemId, table.customizedOrderId] }),
        };
    }
  );


export const adminTable = pgTable(
    "adminaccount",
    {
      adminId: uuid("adminid").defaultRandom().primaryKey(),
      adminName:  varchar("adminname", { length: 30 }).notNull(),
      password: varchar("adminpassword", { length: 100 }).notNull(),
      branchId: uuid("branchid")
        .notNull()
        .references(() => ingredientTable.ingredientId, {
            onDelete: "cascade",
      }),
    },
  );

  export const branchTable = pgTable(
    "branch",
    {
      branchId: uuid("branchid").defaultRandom().primaryKey(),
      branchName:  varchar("branchname", { length: 30 }).notNull(),
      address: varchar("branchaddress", { length: 100 }).notNull(),
      branchPhone:  varchar("branchphone", { length: 10 }).notNull(),
      seatNumber: integer("seatnumber").notNull(),
    },
  );

  export const brandTable = pgTable(
    "brand",
    {
      brandId: uuid("brandid").defaultRandom().primaryKey(),
      brandName:  varchar("brandname", { length: 30 }).notNull(),
    },
  );

  export const customizedOrderTable = pgTable(
    "customized_order",
    {
      customizedOrderId: uuid("customizedorderid").defaultRandom().primaryKey(),
      concentration:  integer("concentration"),
      time: timestamp("time"),
      type:  varchar("type", { length: 10 }).notNull(),
      memberId: uuid("memberid")
        .notNull()
        .references(() => memberAccountTable.memberId, {
            onDelete: "cascade",
      }),
    },
  );

  export const drinkTypeTable = pgTable(
    "drinktype",
    {
      typeId: uuid("typeid").defaultRandom().primaryKey(),
      typeName:  varchar("typename", { length: 30 }).notNull(),
    },
  );

  export const ingredientTable = pgTable(
    "ingredient",
    {
      ingredientId: uuid("ingredientid").defaultRandom().primaryKey(),
      ingredientName:  varchar("ingredientname", { length: 30 }).notNull(),
      unit: varchar("unit", { length: 10 }).notNull(),
    },
  );

  export const itemTable = pgTable(
    "item",
    {
      itemId: uuid("itemid").defaultRandom().primaryKey(),
      itemName:  varchar("itemname", { length: 30 }).notNull(),
      concentration:  integer("concentration"),
      typeId: uuid("typeid")
        .notNull()
        .references(() => drinkTypeTable.typeId, {
            onDelete: "cascade",
      }),
      brandId: uuid("brandid")
        .notNull()
        .references(() => brandTable.brandId, {
            onDelete: "cascade",
      }),
    },
  );

  export const memberAccountTable = pgTable(
    "memberaccount",
    {
      memberId: uuid("memberid").defaultRandom().primaryKey(),
      fname: varchar("fname", { length: 30 }).notNull(),
      lname: varchar("lname", { length: 30 }).notNull(),
      gender: varchar("gender", { length: 10 }).notNull(),
      birthday: date("birthday").notNull(),
      memberStartDate: date("memberstartdate").defaultNow(),
      email: varchar("email", { length: 50 }).notNull(),
      memberPhone: char("memberphone", { length: 10 }).notNull(),
      password: varchar("memberpassword", { length: 30 }).notNull(),
    },
  );

  export const orderTable = pgTable(
    "memberorder",
    {
        memberId: uuid("memberid")
        .notNull()
        .references(() => memberAccountTable.memberId, {
            onDelete: "cascade",
            }),
        recipeId: uuid("recipeid")
        .notNull()
        .references(() => recipeTable.recipeId, {
            onDelete: "cascade",
        }),
        branchId: uuid("branchid")
        .notNull()
        .references(() => branchTable.branchId, {
            onDelete: "cascade",
            }),
        time: timestamp("time"),
        type:  varchar("ordertype", { length: 10 }).notNull(),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.memberId, table.time] }),
          };
      }
  );

  export const recipeTable = pgTable(
    "recipe",
    {
        recipeId: uuid("recipeid").primaryKey(),
        recipeName:  varchar("recipename", { length: 30 }).notNull(),
        steps: varchar("steps", { length: 1000 }).notNull(),
        flavor: varchar("flavor", { length: 30 }).notNull(),
        mood: varchar("mood", { length: 30 }).notNull(),
        concentration:  integer("concentration"),
    },
  );

  export const reserveTable = pgTable(
    "reserve",
    {
        branchId: uuid("branchid")
        .notNull()
        .references(() => branchTable.branchId, {
            onDelete: "cascade",
        }),
        memberId: uuid("memberid")
        .notNull()
        .references(() => memberAccountTable.memberId, {
            onDelete: "cascade",
        }),
        people: integer("people"),
        time: timestamp("time"),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.memberId, table.branchId] }),
          };
      }
  );

  export const ingredientRestockTable = pgTable(
    "ingredient_restock",
    {
        date: date("date").notNull(),
        branchId: uuid("branchid")
        .notNull()
        .references(() => branchTable.branchId, {
            onDelete: "cascade",
        }),
        ingredientId: uuid("ingredientid")
        .notNull()
        .references(() => ingredientTable.ingredientId, {
            onDelete: "cascade",
        }),
        expireDate: date("expiredate").notNull(),
        amount: integer("amount").notNull()
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.date ,table.ingredientId, table.branchId] }),
          };
      }
  );

  export const itemRestockTable = pgTable(
    "item_restock",
    {
        date: date("date").notNull(),
        branchId: uuid("branchid")
        .notNull()
        .references(() => branchTable.branchId, {
            onDelete: "cascade",
        }),
        itemId: uuid("itemid")
        .notNull()
        .references(() => itemTable.itemId, {
            onDelete: "cascade",
        }),
        expireDate: date("expiredate").notNull(),
        amount: integer("amount").notNull()
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.date ,table.itemId, table.branchId] }),
          };
      }
  );

