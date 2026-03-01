import { supabase } from "./supabase";

const ADJECTIVES = [
  "amber", "brave", "calm", "daring", "eager", "fancy", "gentle", "happy",
  "icy", "jolly", "kind", "lively", "misty", "noble", "orange", "peppy",
  "quick", "radiant", "silent", "swift", "teal", "ultra", "vivid", "warm",
  "xtra", "young", "zesty", "bold", "cool", "dark", "epic", "fast", "glad",
  "huge", "iron", "jade", "keen", "lazy", "mega", "neat", "odd", "pink",
  "rosy", "sage", "tiny", "uber", "vast", "wavy", "wild", "zippy", "fuzzy",
  "lucky", "merry", "nifty", "plush", "rusty", "salty", "tangy", "urban",
];

const NOUNS = [
  "panda", "eagle", "tiger", "shark", "raven", "wolf", "bear", "fox",
  "lion", "hawk", "deer", "mole", "duck", "crab", "frog", "owl",
  "seal", "crow", "newt", "vole", "ibis", "lynx", "pike", "wren",
  "bison", "cobra", "dingo", "emu", "finch", "gecko", "heron", "iguana",
  "jackal", "koala", "lemur", "moose", "narwhal", "otter", "parrot",
  "quail", "robin", "sloth", "tapir", "urial", "viper", "walrus",
  "xerus", "yak", "zebra", "alpaca", "badger", "condor", "donkey",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateSlug(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${randomItem(ADJECTIVES)}-${randomItem(NOUNS)}`;
    const { data, error } = await supabase
      .from("sessions")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`Slug check failed: ${error.message}`);
    if (!data) return slug;
  }
  throw new Error("Failed to generate a unique slug after 5 attempts");
}
