import bodyParser from "body-parser";
import cors from "cors";
import express, { query } from "express";
import { db } from "./db";
import { addIngredientTable, addItemTable, branchTable, customizedOrderTable, itemTable, memberAccountTable, orderTable, recipeTable, reserveTable } from "./db/schema";
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
    itemId: string;
    amount: number; 
}

type AddIngredient = {
    ingredientId: string;
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

app.get('/api/getAvailableBranches', async(req, res) => {
    const date = String(req.query.date);
    const people = Number(req.query.people);
    const time = String(req.query.time);

    const queryTimeString = date + " " + time + ":00";
    const queryTime = new Date(queryTimeString);
    console.log(queryTime);

    const subquery = db
    .select({
        branchId: reserveTable.branchId,
        time: reserveTable.time,
        reserved: sql`SUM(${reserveTable.people})`.as("reserved"),
    })
    .from(reserveTable)
    .groupBy(reserveTable.branchId, reserveTable.time)
    .as("subquery");

    const result = await db
    .select({
        branchId: branchTable.branchId,
        time: subquery.time,
        reserved: subquery.reserved,
        address: branchTable.address,
        branchName: branchTable.branchName,
        seatNumber: branchTable.seatNumber,
        branchPhone: branchTable.branchPhone,
    })
    .from(branchTable)
    .leftJoin(subquery, eq(branchTable.branchId, subquery.branchId))
    .orderBy(desc(subquery.time), branchTable.branchId)
    .execute();


    const data = await db.select().from(branchTable).execute();
    const branches: Branch[] = [];
    const id = new Set();

    result.map((b, i) => {
        if ((Number(b.reserved) + people) > (b.seatNumber / 4) && b.time?.toString() === queryTime.toString()) {
            id.add(b.branchId);
        }
    })

    data.map((b, i) => {
        branches.push({address: b.address, id: b.branchId, name: b.branchName, seats: b.seatNumber, phone: b.branchPhone, imageName: "branch" + String(i + 1)})
    })

    

    if (data) {
        res.status(200).send(branches.filter((b) => b.id in id));
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

app.post('/api/postOrder', async(req, res) => {
    const type = req.body.type;
    const deliveryType = req.body.deliveryType;
    const memberId = req.body.memberId;
    const items: OrderItem[] = req.body.items;

    const [user] = await db.select().from(memberAccountTable).where(eq(memberAccountTable.memberId, memberId));
    if (!user) {
        res.status(400).send({msg: "user not found"});
    }
    console.log(items);

    if (deliveryType !== "Delivery") {
        const branchId: string = req.body.branchId;

        
        const [branch] = await db.select().from(branchTable).where(eq(branchTable.branchId, branchId));
        if (!branch) {
            res.status(400).send({msg: "branch not found"});
        }
        else {
            try {
                    await db.insert(orderTable).values({branchId: branch.branchId, recipeId: items[0].id, memberId: user.memberId, type: deliveryType});
                    res.status(200).send("post order ok");
                } catch(err) {
                    console.log(err);
                    res.status(400).send("post order fail");
                }
        }
    }
    else {
        const addItemList: AddItem[] = req.body.addItemList; 
        let concentration = 0
        let totalAmount = 0
        let alcoholAmount = 0

        const [result] = await db.select().from(memberAccountTable).where(eq(memberAccountTable.memberId, memberId));

        if (!result) {
            res.status(400).send({msg: "user not found"});
        }
        else {
            try {
                    const [result] = await db.insert(customizedOrderTable).values({memberId, concentration, type}).returning({customizedOrderId: customizedOrderTable.customizedOrderId});
                    addItemList.forEach(async(addItem) => {
                        totalAmount += addItem.amount;
                        const [item] = await db.select({concentration: itemTable.concentration}).from(itemTable).where(eq(itemTable.itemId, addItem.itemId)).execute();
                        if (item) {
                            alcoholAmount += item.concentration ?? 0;
                            await db.insert(addItemTable).values({customizedOrderId: result.customizedOrderId, itemId: addItem.itemId, amount: addItem.amount});
                        } 
                        
                    });

                    await db.update(customizedOrderTable).set({concentration});
                    res.status(200).send({msg: "post customized order ok"});
                } catch(err) {
                    console.log(err);
                    res.status(400).send({msg: "post customized order fail"});
                }
        }
    }
    
});

app.post('/api/postCustomizedOrder', async(req, res) => {
    const type = req.body.type;
    const memberId = req.body.memberId;
    const addItemList: AddItem[] = req.body.addItemList;
    const addIngredientList: AddIngredient[] = req.body.addIngredientList;
    let concentration = 0
    let totalAmount = 0
    let alcoholAmount = 0

    const [result] = await db.select().from(memberAccountTable).where(eq(memberAccountTable.memberId, memberId));

    if (!result) {
        res.status(400).send({msg: "user not found"});
    }
    else {
        try {
                const [result] = await db.insert(customizedOrderTable).values({memberId, concentration, type}).returning({customizedOrderId: customizedOrderTable.customizedOrderId});
                addItemList.forEach(async(addItem) => {
                    totalAmount += addItem.amount;
                    const [item] = await db.select({concentration: itemTable.concentration}).from(itemTable).where(eq(itemTable.itemId, addItem.itemId)).execute();
                    if (item) {
                        alcoholAmount += item.concentration ?? 0;
                        await db.insert(addItemTable).values({customizedOrderId: result.customizedOrderId, itemId: addItem.itemId, amount: addItem.amount});
                    } 
                    
                });
                addIngredientList.forEach(async(addIngredient) => {
                    await db.insert(addIngredientTable).values({customizedOrderId: result.customizedOrderId, ingredientId: addIngredient.ingredientId, amount: addIngredient.amount});
                });

                await db.update(customizedOrderTable).set({concentration});
                res.status(200).send({msg: "post customized order ok"});
            } catch(err) {
                console.log(err);
                res.status(400).send({msg: "post customized order fail"});
            }
    }
});

app.post('/api/postReservation', async(req, res) => {
    const memberId = req.body.memberId;
    const people = req.body.people;
    const time = req.body.time;
    const branchId = req.body.branchId;

    const [result] = await db.select().from(memberAccountTable).where(eq(memberAccountTable.memberId, memberId));

    if (!result) {
        res.status(400).send({msg: "user not found"});
    }
    else {
        try {
                await db.insert(reserveTable).values({memberId, people, time: time, branchId}).returning({customizedOrderId: customizedOrderTable.customizedOrderId});
                
                res.status(200).send({msg: "post reservation ok"});
            } catch(err) {
                console.log(err);
                res.status(400).send({msg: "post reservation fail"});
            }
    }
    
});



const port = process.env.PORT || 3001;
app.listen(port , () =>
    console.log(`Server running on port http://localhost:${port}`),
);
