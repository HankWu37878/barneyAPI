import bodyParser from "body-parser";
import cors from "cors";
import express, { query } from "express";
import { db } from "./db";
import { addIngredientTable, addItemTable, branchTable, customizedOrderTable, drinkTypeTable, itemTable, memberAccountTable, orderTable, recipeTable, reserveTable } from "./db/schema";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, isNull, or, sql, sum } from "drizzle-orm";

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
import { error } from "console";

type Branch = {
    id: string;
    name: string;
    phone: string;
    address: string;
    seats: number;   
    imageName: string;
}

type AvailableBranch = {
    id: string;
    name: string;
    phone: string;
    address: string;
    seats: number;   
    imageName: string;
    availableSeats: number;
}

type Recipe = {
    id: string;
    drinkName: string;
    flavor: string;
    mood: string;
    intensity: number;   
    // imageName: string;
}

type OrderItem = {
    id: string;
    amount: number;
    unit: string;
}

type AddItem = {
    id: string;
    amount: number; 
}

type AddIngredient = {
    id: string;
    amount: number; 
}



const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/", (_, res) => {
  return res.send({ message: "Hello World!" });
});

app.get('/api/getAllBranches', async(_, res) => {
    const result = await db.select().from(branchTable).execute();
    const branches: Branch[] = [];
    result.map((b, i) => {
        branches.push({address: b.address, id: b.branchId, name: b.branchName, seats: b.seatNumber, phone: b.branchPhone, imageName: "branch" + String(i + 1)})
    })
    if (result) {
        res.status(200).send(branches);
    }
    else {
        res.status(400).send({msg: "get all branches fail"});
    }
});

app.get('/api/getAllTypes', async(_, res) => {
    const types = await db.select({id: drinkTypeTable.typeId, name: drinkTypeTable.typeName}).from(drinkTypeTable).execute();
    
    if (types) {
        res.status(200).send(types);
    }
    else {
        res.status(400).send({msg: "get all types fail"});
    }
});

app.get('/api/getItems', async(req, res) => {
    const typeId = req.query.typeId;
    const items = await db.select({id: itemTable.itemId, name: itemTable.itemName}).from(itemTable).where(eq(itemTable.typeId, String(typeId))).execute();
    
    if (items) {
        res.status(200).send(items);
    }
    else {
        res.status(400).send({msg: "get items fail"});
    }
});

app.get('/api/getAvailableBranches', async(req, res) => {
    const date = String(req.query.date);
    const people = Number(req.query.people);
    const time = String(req.query.time);

    const queryTimeString = date + " " + time + ":00";
    const selectedTime = new Date(queryTimeString);

    
    const ninetyMinutesBefore = new Date(selectedTime.getTime() - 90 * 60 * 1000); // Calculate 90 minutes before the selected time.

    const result = await db
    .select({
        id: branchTable.branchId,
        name: branchTable.branchName,
        seats: branchTable.seatNumber,
        phone: branchTable.branchPhone,
        address: branchTable.address,
        // reservedSeats: sql`COALESCE(SUM(${reserveTable.people}), 0)`.as('ReservedSeats'),
        availableSeats: sql`${branchTable.seatNumber} - COALESCE(SUM(${reserveTable.people}), 0)`.as('AvailableSeats'),
    })
    .from(branchTable)
    .leftJoin(reserveTable, sql`${branchTable.branchId} = ${reserveTable.branchId} AND ${reserveTable.time} BETWEEN ${ninetyMinutesBefore} AND ${selectedTime}`)
    .groupBy(branchTable.branchId, branchTable.branchName, branchTable.seatNumber)
    .having(sql`${branchTable.seatNumber} - COALESCE(SUM(${reserveTable.people}), 0) >= ${people}`);
    
    const branches: AvailableBranch[] = [];

    if (result) {
        result.map((b, i) => branches.push({address: b.address, id: b.id, name: b.name, seats: b.seats, phone: b.phone, imageName: "branch" + String(i + 1), availableSeats: Number(b.availableSeats)}));
        res.status(200).send(branches);
    }
    else {
        res.status(400).send({error: "get available branches wrong"});
    }
});

app.get('/api/getAllRecipes', async(_, res) => {
    const result = await db.select().from(recipeTable).execute();
    const recipes: Recipe[] = [];
    result.map((r) => {
        recipes.push({drinkName: r.recipeName, id: r.recipeId, flavor: r.flavor, mood: r.mood, intensity: r.concentration ?? 0})
    })
    if (result) {
        res.status(200).send(recipes);
    }
    else {
        res.status(400).send({msg: "get all recipes fail"});
    }
});

app.post('/api/login', async(req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const [result] = await db.select({id: memberAccountTable.memberId, password: memberAccountTable.password, fname: memberAccountTable.fname, lname: memberAccountTable.lname, gender: memberAccountTable.gender, email: memberAccountTable.email, phone: memberAccountTable.memberPhone}).from(memberAccountTable).where(eq(memberAccountTable.email, email));

    const isValid = await bcrypt.compare(password, result.password ?? "");
    if (isValid) {
        res.status(200).send( {success: true, fname: result.fname, lname: result.lname, gender: result.gender, phone: result.phone, id: result.id} );
    }
    else {
        res.status(400).send({success: false});
    }
});

app.post('/api/signup', async(req, res) => {
    const fname = req.body.fname;
    const lname = req.body.lname;
    const gender = req.body.gender;
    const birthday = String(req.body.birthday).substring(0, 10);
    const email = req.body.email;
    const memberPhone = req.body.phone;
    const password = req.body.password;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.select().from(memberAccountTable).where(or(eq(memberAccountTable.email, email), eq(memberAccountTable.memberPhone, memberPhone)));

    if (result) {
        res.status(400).send({msg: "exist account"});
    }
    else {
        try {
                await db.insert(memberAccountTable).values({lname, fname, gender, birthday, email, memberPhone, password: hashedPassword});
                res.status(200).send({msg: "signup ok"});
            } catch(err) {
                console.log(err);
                res.status(400).send({msg: "signup fail"});
            }
    }
});

app.post('/api/postOrder', async (req, res) => {
    try {
      await db.transaction(async (trx) => {
        const exist = req.body.type;
        const deliveryType = req.body.deliveryType;
        const memberId = req.body.memberId;
        const items: OrderItem[] = req.body.items;
        const branchId: string = req.body.branchId;
  
        // Lock the branch row for updates
        const [branch] = await trx
          .select()
          .from(branchTable)
          .where(eq(branchTable.branchId, branchId))
          .for('update', { skipLocked: true }); // Lock acquired on the branch row
  
        if (!branch) {
          throw new Error("branch not found");
        }
  
        // Lock the user row for updates
        const [user] = await trx
          .select()
          .from(memberAccountTable)
          .where(eq(memberAccountTable.memberId, memberId))
          .for('update', { skipLocked: true }); // Lock acquired on the user row
  
        if (!user) {
          throw new Error("user not found");
        }
  
        if (exist) {
          await trx.insert(orderTable).values({
            branchId: branch.branchId,
            recipeId: items[0].id,
            memberId: user.memberId,
            type: deliveryType,
          });
        } else {
          let concentration = 0;
          const [customizedOrder] = await trx
            .insert(customizedOrderTable)
            .values({ memberId, concentration, type: deliveryType, branchId })
            .returning({ customizedOrderId: customizedOrderTable.customizedOrderId });
  
          for (const addItem of items) {
            const [item] = await trx
              .select({ concentration: itemTable.concentration })
              .from(itemTable)
              .where(eq(itemTable.itemId, addItem.id))
              .execute();
  
            if (item) {
              concentration += (item.concentration ?? 0) * addItem.amount;
              await trx.insert(addItemTable).values({
                customizedOrderId: customizedOrder.customizedOrderId,
                itemId: addItem.id,
                amount: addItem.amount,
              });
            }
          }
  
          await trx
            .update(customizedOrderTable)
            .set({ concentration })
            .where(eq(customizedOrderTable.customizedOrderId, customizedOrder.customizedOrderId));
        }
      });
  
      res.status(200).send({ msg: "post order ok" });
    } catch (err) {
      console.error(err);
      res.status(400).send({ msg: "post order fail" });
    }
  });
  



  app.post('/api/postReservation', async (req, res) => {
    try {
      await db.transaction(async (trx) => {
        const memberId = req.body.memberId;
        const branchId = req.body.branchId;
        const date = String(req.body.date);
        const people = Number(req.body.people);
        const time = String(req.body.time);
  
        const queryTimeString = `${date} ${time}:00`;
        const [year, month, day] = date.split('-'); // Assuming the date format is YYYY-MM-DD
        const [hour, minute] = time.split(':');
        const selectedTime = new Date(
          Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
        ); // Use UTC to prevent time zone conversion
  
        // Lock the branch row for updates
        const [branch] = await trx
          .select()
          .from(branchTable)
          .where(eq(branchTable.branchId, branchId))
          .for('update', { skipLocked: true }); // Lock acquired on the branch row
  
        if (!branch) {
          throw new Error("branch not found");
        }
  
        // Lock the user row for updates
        const [user] = await trx
          .select()
          .from(memberAccountTable)
          .where(eq(memberAccountTable.memberId, memberId))
          .for('update', { skipLocked: true }); // Lock acquired on the user row
  
        if (!user) {
          throw new Error("user not found");
        }
  
        // Insert the reservation
        await trx.insert(reserveTable).values({
          memberId,
          people,
          time: selectedTime,
          branchId,
        });
        res.status(200).send("post reservation ok");
      });
    } catch (err) {
      console.error(err);
      res.status(400).send("post reservation fail");
    }
  });
  



const port = process.env.PORT || 3001;
app.listen(port , () =>
    console.log(`Server running on port http://localhost:${port}`),
);
