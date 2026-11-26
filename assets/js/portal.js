window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const entryPaths = [
    'student/space-search.html', 'student/my-bookings.html', 'student/tasks.html',
    'student/companion.html', 'student/evidence.html', 'student/credentials.html',
    'student/my-data.html', 'student/messages.html', 'student/help.html'
  ];
  function entries(account) {
    return FLC.PAGES.filter(page => entryPaths.includes(page.path) && FLC.guard.canAccess(page, account));
  }
  function todoTasks(tasks, submissions, userId, now) {
    return (tasks || []).filter(task => task.status === 'published' && Date.parse(task.due_at) > now &&
      !(submissions || []).some(item => item.user_id === userId && item.task_id === task.id))
      .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  }
  function upcomingBookings(bookings, userId, now) {
    return (bookings || []).filter(booking => booking.status === 'confirmed' &&
      (booking.booker_id === userId || (booking.participants || []).some(item => item.user_id === userId)) &&
      Date.parse(booking.from) > now).sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
  }
  FLC.portal = { entries, todoTasks, upcomingBookings };
})(window.FLC);
