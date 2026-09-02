import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Settings from "../models/Settings.js";
import { getRetentionCutoffDate } from "./dateUtils.js";

// Called on every /state load (see routes/state.js) with the client's
// local "today". Hard-deletes transactions older than the retention
// window, and prunes budget-history map entries older than it too, so old
// snapshots don't accumulate forever on categories/settings that are
// otherwise kept indefinitely.
export async function pruneOldData(userId, today) {
  const cutoffDate = getRetentionCutoffDate(today); // "YYYY-01-01"
  const cutoffMonthKey = cutoffDate.slice(0, 7); // "YYYY-01"

  await Transaction.deleteMany({ userId, date: { $lt: cutoffDate } });

  const pruneMap = (map) => {
    let changed = false;
    for (const key of Array.from(map.keys())) {
      if (key < cutoffMonthKey) {
        map.delete(key);
        changed = true;
      }
    }
    return changed;
  };

  const [categories, settings] = await Promise.all([
    Category.find({ userId }),
    Settings.findOne({ userId }),
  ]);

  const saves = categories.filter((c) => pruneMap(c.limits)).map((c) => c.save());
  if (settings && pruneMap(settings.monthlyLimits)) saves.push(settings.save());

  await Promise.all(saves);
}