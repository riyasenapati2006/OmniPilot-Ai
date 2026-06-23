/**
 * Exam/Study Agent (StudyExpert)
 * Schedules spaced repetition study slots and designs effective syllabus review strategies.
 */
class StudyExpertAgent {
  constructor() {
    this.name = 'StudyExpert';
    this.description = 'Designs custom study plans utilizing active recall and spaced repetition methodologies.';
  }

  getSpacedRepetitionIntervals(daysUntilExam) {
    if (daysUntilExam <= 3) {
      return [1, 2]; // Intensified prep
    }
    return [1, 3, 5]; // Default spaced repetition days
  }
}

module.exports = new StudyExpertAgent();
