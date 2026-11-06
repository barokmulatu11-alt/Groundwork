const fs = require('fs');
const filePath = 'c:/Barok/Projects/Groundwork/lib/notifications.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `export const displayTestNotification = async (): Promise<void> => {
  await requestNotificationPermissions();
  await notifee.displayNotification({
    title: "GroundWork Notification Test",
    body: "Your Notifee notification system is working perfectly!",
    android: {
      channelId: "groundwork",
      color: "#007AFF",
      pressAction: {
        id: "default",
      },
    },
  });
};`;

const addition = `export const testTaskReminderNotification = async (taskTitle: string = "Finish Project Proposal"): Promise<void> => {
  await requestNotificationPermissions();
  await notifee.displayNotification({
    title: "Task Reminder",
    body: \`"\${taskTitle}" is starting in 15 minutes. You've got this!\`,
    android: {
      channelId: "groundwork",
      color: "#007AFF",
      pressAction: { id: "default" },
    },
  });
};

export const testHabitStreakNotification = async (habitTitle: string = "Morning Workout"): Promise<void> => {
  await requestNotificationPermissions();
  await notifee.displayNotification({
    title: "Streak Alert",
    body: \`Keep your 5-day streak alive! Complete "\${habitTitle}" today.\`,
    android: {
      channelId: "groundwork",
      color: "#007AFF",
      pressAction: { id: "default" },
    },
  });
};

export const testFocusCompleteNotification = async (): Promise<void> => {
  await requestNotificationPermissions();
  await notifee.displayNotification({
    title: "Focus Session Complete",
    body: "25 minutes of deep focus done. Take a well-earned 5-minute break!",
    android: {
      channelId: "groundwork",
      color: "#007AFF",
      pressAction: { id: "default" },
    },
  });
};

export const testDailySummaryNotification = async (): Promise<void> => {
  await requestNotificationPermissions();
  await notifee.displayNotification({
    title: "Good Morning",
    body: "You have 3 tasks scheduled for today. Make today count!",
    android: {
      channelId: "groundwork",
      color: "#007AFF",
      pressAction: { id: "default" },
    },
  });
};`;

if (!content.includes(target.replace(/\r?\n/g, '\r\n')) && !content.includes(target.replace(/\r?\n/g, '\n'))) {
  console.error('Target not found in lib/notifications.ts');
  process.exit(1);
}

const isCRLF = content.includes('\r\n');
const sep = isCRLF ? '\r\n\r\n' : '\n\n';
const searchStr = isCRLF ? target.replace(/\r?\n/g, '\r\n') : target.replace(/\r?\n/g, '\n');
const replacementStr = searchStr + sep + (isCRLF ? addition.replace(/\r?\n/g, '\r\n') : addition.replace(/\r?\n/g, '\n'));

content = content.replace(searchStr, replacementStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added test notification functions to lib/notifications.ts');
