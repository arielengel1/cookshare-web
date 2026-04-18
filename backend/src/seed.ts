import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import postRoutes from './routes/postRoutes';
import commentRoutes from './routes/commentRoutes';
import likeRoutes from './routes/likeRoutes';
import profileRoutes from './routes/profileRoutes';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts/:postId/comments', commentRoutes);
app.use('/api/posts/:postId/likes', likeRoutes);

const USERS = [
  { email: 'alice@seed.dev', password: 'seed_password_123', name: 'Alice Chen' },
  { email: 'bob@seed.dev',   password: 'seed_password_123', name: 'Bob Martinez' },
  { email: 'carol@seed.dev', password: 'seed_password_123', name: 'Carol Johnson' },
];

// 25 posts per user, grouped by category so there are multiple dishes per theme
const POSTS_BY_USER = [
  [
    // Pizza (3)
    'Classic margherita pizza with fresh mozzarella and basil — my go-to Friday night comfort food',
    'Pepperoni and ricotta white pizza on a thin sourdough crust, baked in a screaming hot oven',
    'Four-cheese pizza with gorgonzola, taleggio, mozzarella and parmigiano on a crispy base',
    // Pasta (3)
    'Spaghetti carbonara with guanciale, egg yolk, pecorino and a generous crack of black pepper',
    'Pappardelle with slow-braised beef ragu and a glass of chianti — Sunday at its best',
    'Pasta e fagioli — a thick Italian bean and pasta soup that is basically a hug in a bowl',
    // Risotto (2)
    'Creamy mushroom risotto with dry white wine and freshly grated parmesan — worth every stir',
    'Saffron risotto alla Milanese with bone marrow and a drizzle of good olive oil',
    // Cakes & Desserts (4)
    'Rich chocolate lava cake with vanilla ice cream, perfect for a dinner party dessert',
    'Tiramisu with espresso-soaked ladyfingers, mascarpone cream and a dusting of cocoa',
    'Lemon olive oil cake with a crunchy sugar crust — simple, moist and absolutely addictive',
    'Panna cotta with fresh strawberry coulis and crushed pistachios on top',
    // Fish & Seafood (3)
    'Grilled salmon with lemon butter sauce and roasted asparagus, ready in under 30 minutes',
    'Pan-seared sea bass with capers, cherry tomatoes and white wine sauce',
    'Garlic butter shrimp scampi with linguine and fresh parsley — weeknight hero dish',
    // Breakfast (3)
    'Avocado toast with soft poached eggs, red pepper flakes and everything bagel seasoning',
    'Ricotta pancakes with blueberry compote and a dusting of powdered sugar',
    'Shakshuka — eggs poached in spiced tomato and pepper sauce with crusty bread for dipping',
    // Salads (3)
    'Burrata salad with heirloom tomatoes, fresh basil and aged balsamic reduction',
    'Panzanella — Tuscan bread and tomato salad with red onion, capers and red wine vinegar',
    'Warm roasted beet salad with goat cheese, candied walnuts and honey-dijon vinaigrette',
    // Soups (2)
    'Roasted tomato soup with basil oil and a grilled cheese sandwich for dunking',
    'Minestrone loaded with seasonal vegetables, cannellini beans and a rind of parmesan',
    // Meat (2)
    'Chicken piccata with lemon-caper butter sauce served over angel hair pasta',
    'Slow-roasted lamb shoulder with rosemary, garlic and a rich red wine jus',
  ],
  [
    // Tacos & Mexican (4)
    'Street-style beef tacos with salsa verde, pickled jalapeños and fresh cilantro',
    'Fish tacos with battered cod, cabbage slaw, chipotle mayo and mango salsa',
    'Birria de res — slow-braised beef tacos dipped in rich consommé, topped with onion and cilantro',
    'Chicken enchiladas smothered in red chile sauce and melted Oaxacan cheese',
    // BBQ & Grilled (4)
    'Slow-cooked BBQ pork ribs with smoky dry rub and apple cider vinegar mop sauce',
    'Smash burgers with American cheese, caramelized onions and pickles on a brioche bun',
    'Grilled skirt steak with chimichurri sauce and charred corn on the cob',
    'Sticky honey-garlic chicken thighs on the grill — finger-licking good',
    // Asian (4)
    'Spicy Thai green curry with coconut milk, vegetables and fragrant jasmine rice',
    'Pad thai with shrimp, bean sprouts, peanuts, lime and a soft-scrambled egg',
    'Tonkotsu ramen with chashu pork, soft-boiled marinated egg and crispy nori',
    'Korean bibimbap with seasoned vegetables, gochujang, a fried egg and warm white rice',
    // Fried & Comfort (3)
    'Crispy Southern fried chicken with creamy coleslaw and drizzled hot honey',
    'Buffalo chicken wings with blue cheese dipping sauce — perfect game day food',
    'Mac and cheese with a breadcrumb crust, baked until bubbly and golden brown',
    // Salads (3)
    'Caesar salad with homemade garlic croutons, anchovy dressing and shaved parmesan',
    'Nicoise salad with seared tuna, green beans, olives, eggs and Dijon vinaigrette',
    'Watermelon and feta salad with mint, red onion and a squeeze of lime',
    // Breakfast & Brunch (3)
    'Fluffy banana pancakes with warm maple syrup and a handful of mixed fresh berries',
    'Huevos rancheros with crispy tortillas, black beans, salsa roja and crumbled cotija',
    'Breakfast burrito with scrambled eggs, chorizo, roasted peppers and pepper jack cheese',
    // Drinks & Smoothies (2)
    'Mango lassi with cardamom, honey and a pinch of salt — best cooling summer drink',
    'Horchata made from scratch with cinnamon, rice and vanilla — refreshing and creamy',
    // Soup (2)
    'Chicken tortilla soup with black beans, corn, avocado and crunchy tortilla strips',
    'Pozole rojo — hominy and pork shoulder simmered in a deep red chile broth',
  ],
  [
    // Middle Eastern (4)
    'Homemade hummus with extra virgin olive oil, zaatar and warm pita bread',
    'Falafel with tahini sauce, pickled turnips and fresh herb salad in a toasted pita',
    'Baba ganoush with smoky roasted eggplant, lemon and pomegranate seeds',
    'Lamb kofta with harissa yogurt and a cucumber tomato salad — weeknight winner',
    // Vegan (4)
    'Vegan red lentil stew with turmeric, cumin and a squeeze of lemon',
    'Roasted cauliflower steaks with chermoula, chickpeas and pomegranate molasses',
    'Sweet potato and black bean burrito bowl with avocado, salsa and lime-cilantro rice',
    'Mushroom and walnut bolognese on rigatoni — you will not miss the meat',
    // Soups & Stews (4)
    'Classic French onion soup with a melted gruyere crouton topping — so warming',
    'Lentil and spinach soup with cumin-spiced oil drizzled on top',
    'Tom kha gai — Thai coconut chicken soup with galangal, lemongrass and kaffir lime',
    'Harira — Moroccan tomato, lentil and chickpea soup traditionally served to break the fast',
    // Japanese & Asian (4)
    'Homemade sushi rolls with fresh tuna, cucumber and toasted sesame seeds',
    'Gyoza dumplings pan-fried until golden with a soy-ginger-rice vinegar dipping sauce',
    'Agedashi tofu in a delicate dashi broth with grated daikon and spring onion',
    'Miso-glazed eggplant roasted until caramelized and served with steamed rice',
    // Baked Goods (4)
    'Tiramisu with espresso-soaked ladyfingers, mascarpone cream and cocoa powder',
    'Chocolate babka with a dark chocolate-cinnamon swirl and glossy egg-wash crust',
    'Carrot cake with cream cheese frosting, candied pecans and a hint of warm spice',
    'Banana bread with dark chocolate chips and a brown butter glaze — zero waste baking',
    // Greek & Mediterranean (3)
    'Spinach and feta spanakopita triangles with shatteringly crisp phyllo pastry',
    'Greek gyros with tzatziki, sliced tomato, red onion and pita — street food perfection',
    'Moussaka with layers of eggplant, spiced lamb ragu and a thick béchamel crust',
    // Salads (2)
    'Tabbouleh with fine bulgur, mountains of parsley, mint, tomato and lemon',
    'Fattoush with toasted pita chips, radish, cucumber, sumac and pomegranate dressing',
  ],
];

const COMMENTS = [
  'This looks absolutely delicious! Definitely making this tonight.',
  'I tried this recipe last week and my whole family loved it!',
  'What temperature do you cook this at? Would love more details.',
  'This is one of my all-time favorite dishes — great post!',
  'Perfect for a cozy weekend meal, thanks for sharing!',
  'The plating looks beautiful, I can almost smell it through the screen.',
  'Do you have any tips for making this dairy-free?',
  'Made this last Sunday and it was a huge hit at dinner!',
  'The flavor combination here is genius, never would have thought of this.',
  'Bookmarked! This is going straight into my weekly rotation.',
];

async function registerOrSkip(email: string, password: string, name: string): Promise<void> {
  const res = await request(app).post('/api/auth/register').send({ email, password, name });
  if (res.status === 201) {
    console.log(`  Registered: ${name} <${email}>`);
  } else if (res.status === 400 && res.body?.message === 'Email already exists') {
    console.log(`  Already exists: ${name} <${email}>`);
  } else {
    throw new Error(`Failed to register ${email}: ${JSON.stringify(res.body)}`);
  }
}

async function loginUser(email: string, password: string): Promise<{ token: string; userId: string }> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Failed to login ${email}: ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken, userId: res.body.user._id };
}

async function getExistingPostTexts(token: string, userId: string): Promise<Set<string>> {
  const res = await request(app)
    .get(`/api/profile/${userId}/posts`)
    .set('Authorization', `Bearer ${token}`);
  if (res.status !== 200 || !Array.isArray(res.body)) return new Set();
  return new Set(res.body.map((p: { text: string }) => p.text));
}

async function createPost(token: string, text: string): Promise<string> {
  const res = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({ text });
  if (res.status !== 201) throw new Error(`Failed to create post: ${JSON.stringify(res.body)}`);
  return res.body._id;
}

async function addComment(token: string, postId: string, text: string): Promise<void> {
  const res = await request(app)
    .post(`/api/posts/${postId}/comments`)
    .set('Authorization', `Bearer ${token}`)
    .send({ text });
  if (res.status !== 201) throw new Error(`Failed to add comment: ${JSON.stringify(res.body)}`);
}

async function likePost(token: string, postId: string): Promise<void> {
  const res = await request(app)
    .post(`/api/posts/${postId}/likes`)
    .set('Authorization', `Bearer ${token}`);
  if (res.status !== 200) throw new Error(`Failed to like post: ${JSON.stringify(res.body)}`);
}

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cookshare';
  console.log(`\nConnecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  console.log('--- Users ---');
  for (const u of USERS) {
    await registerOrSkip(u.email, u.password, u.name);
  }

  console.log('\n--- Posts ---');
  const sessions: Array<{ token: string; userId: string }> = [];
  const newPostIds: string[] = [];
  const newPostAuthorIndex: number[] = [];

  for (let i = 0; i < USERS.length; i++) {
    const session = await loginUser(USERS[i].email, USERS[i].password);
    sessions.push(session);

    const existing = await getExistingPostTexts(session.token, session.userId);
    let created = 0;

    for (const text of POSTS_BY_USER[i]) {
      if (existing.has(text)) {
        continue;
      }
      const postId = await createPost(session.token, text);
      newPostIds.push(postId);
      newPostAuthorIndex.push(i);
      created++;
      console.log(`  [${USERS[i].name}] (${created}) ${text.substring(0, 65)}...`);
    }

    if (created === 0) {
      console.log(`  ${USERS[i].name}: all posts already exist, skipping.`);
    } else {
      console.log(`  ${USERS[i].name}: created ${created} new post(s).`);
    }
  }

  if (newPostIds.length === 0) {
    console.log('\nAll posts already seeded — nothing to do.');
    await mongoose.connection.close();
    return;
  }

  console.log('\n--- Comments & Likes ---');
  for (let i = 0; i < newPostIds.length; i++) {
    const postId = newPostIds[i];
    const authorIndex = newPostAuthorIndex[i];
    for (let j = 0; j < sessions.length; j++) {
      if (j === authorIndex) continue;
      if (i % 2 === j % 2) {
        await addComment(sessions[j].token, postId, COMMENTS[(i + j) % COMMENTS.length]);
      }
      if ((i + j) % 3 === 0) {
        await likePost(sessions[j].token, postId);
      }
    }
  }

  console.log('\n--- Done ---');
  console.log(`  Created ${newPostIds.length} new post(s) across ${USERS.length} user(s).`);
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message ?? err);
  process.exit(1);
});
