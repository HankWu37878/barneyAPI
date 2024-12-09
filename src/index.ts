import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { db } from "./db";
import { addIngredientTable, addItemTable, branchTable, customizedOrderTable, itemTable, memberAccountTable, orderTable, recipeTable } from "./db/schema";
import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
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

    const [result] = await db.select({password: memberAccountTable.password, fname: memberAccountTable.fname, lname: memberAccountTable.lname, gender: memberAccountTable.gender, email: memberAccountTable.email, phone: memberAccountTable.memberPhone}).from(memberAccountTable).where(eq(memberAccountTable.email, email));

    const isValid = await bcrypt.compare(password, result.password ?? "");
    if (isValid) {
        res.status(200).send( {success: true, fname: result.fname, lname: result.lname, gender: result.gender, phone: result.phone} );
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
    const recipeId = req.body.recipeId;
    const memberId = req.body.memberId;
    const branchId = req.body.branchId;

    const [result] = await db.select().from(memberAccountTable).where(eq(memberAccountTable.memberId, memberId));

    if (!result) {
        res.status(400).send({msg: "user not found"});
    }
    else {
        try {
                await db.insert(orderTable).values({branchId, recipeId, memberId, type});
                res.status(200).send({msg: "post order ok"});
            } catch(err) {
                console.log(err);
                res.status(400).send({msg: "post order fail"});
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



const port = process.env.PORT || 3001;
app.listen(port , () =>
    console.log(`Server running on port http://localhost:${port}`),
);
