import mongoose from "mongoose";

// Required skills sub-schema
const requiredSkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"], required: true },
  importance: { type: String, enum: ["Must-have", "Nice-to-have", "Preferred"], default: "Must-have" },
  yearsRequired: { type: Number, default: 0 }
});

// Benefits sub-schema
const benefitSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String },
  value: { type: String }
});

const jobSchema = new mongoose.Schema({
  // Basic Job Information
  title: {
    type: String,
    required: [true, "Please provide a title."],
    minLength: [3, "Title must contain at least 3 Characters!"],
    maxLength: [100, "Title cannot exceed 100 Characters!"],
  },
  description: {
    type: String,
    required: [true, "Please provide description."],
    minLength: [30, "Description must contain at least 30 Characters!"],
    maxLength: [5000, "Description cannot exceed 5000 Characters!"],
  },
  category: {
    type: String,
    required: [true, "Please provide a category."],
  },
  
  // Location Information
  country: {
    type: String,
    required: [true, "Please provide a country name."],
  },
  city: {
    type: String,
    required: [true, "Please provide a city name."],
  },
  location: {
    type: String,
    required: [true, "Please provide location."],
    minLength: [20, "Location must contain at least 20 characters!"],
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  workArrangement: {
    type: String,
    enum: ["Remote", "On-site", "Hybrid"],
    default: "On-site"
  },
  
  // Job Details
  jobType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Freelance", "Internship"],
    required: true,
    default: "Full-time"
  },
  experienceLevel: {
    type: String,
    enum: ["Entry Level", "Mid Level", "Senior Level", "Executive"],
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  
  // Salary Information
  fixedSalary: {
    type: Number,
    min: [1000, "Salary must be at least 1000"],
  },
  salaryFrom: {
    type: Number,
    min: [1000, "Salary must be at least 1000"],
  },
  salaryTo: {
    type: Number,
    min: [1000, "Salary must be at least 1000"],
  },
  currency: {
    type: String,
    default: "USD"
  },
  salaryNegotiable: {
    type: Boolean,
    default: false
  },
  
  // Requirements
  requiredSkills: [requiredSkillSchema],
  minExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  maxExperience: {
    type: Number,
    min: 0
  },
  education: {
    level: { type: String, enum: ["High School", "Bachelor's", "Master's", "PhD", "Certificate", "No Requirement"] },
    field: { type: String },
    required: { type: Boolean, default: false }
  },
  
  // Job Benefits & Perks
  benefits: [benefitSchema],
  
  // Application Process
  applicationDeadline: {
    type: Date
  },
  questionsForCandidates: [{
    question: { type: String, required: true },
    type: { type: String, enum: ["text", "multiple-choice", "file"], default: "text" },
    options: [String], // for multiple-choice questions
    required: { type: Boolean, default: false }
  }],
  
  // Job Status
  status: {
    type: String,
    enum: ["active", "paused", "closed", "draft"],
    default: "active"
  },
  expired: {
    type: Boolean,
    default: false,
  },
  
  // Analytics
  views: { type: Number, default: 0 },
  applications: { type: Number, default: 0 },
  
  // AI Matching Data
  aiKeywords: [String], // Extracted keywords for matching
  matchingScore: { type: Number, default: 0 }, // Overall job attractiveness score
  
  // Timestamps
  jobPostedOn: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // References
  postedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  company: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  }
});

// Extract keywords from job description and title
jobSchema.methods.extractKeywords = function() {
  const text = `${this.title} ${this.description}`.toLowerCase();
  const keywords = [];
  
  // Add required skills
  if (this.requiredSkills) {
    this.requiredSkills.forEach(skill => {
      keywords.push(skill.name.toLowerCase());
    });
  }
  
  // Extract from title and description (basic keyword extraction)
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'];
  
  const words = text.match(/\b\w{3,}\b/g) || [];
  words.forEach(word => {
    if (!commonWords.includes(word) && !keywords.includes(word)) {
      keywords.push(word);
    }
  });
  
  this.aiKeywords = keywords.slice(0, 50); // Limit to 50 keywords
  return this.aiKeywords;
};

// Calculate compatibility score with a candidate
jobSchema.methods.calculateCompatibilityScore = function(candidate) {
  let score = 0;
  let maxScore = 100;
  
  // Skills matching (40% of total score)
  if (this.requiredSkills && this.requiredSkills.length > 0 && candidate.skills && candidate.skills.length > 0) {
    let skillsScore = 0;
    let totalRequiredSkills = this.requiredSkills.length;
    
    this.requiredSkills.forEach(requiredSkill => {
      const candidateSkill = candidate.skills.find(s => 
        s.name.toLowerCase() === requiredSkill.name.toLowerCase()
      );
      
      if (candidateSkill) {
        let skillScore = 10; // Base score for having the skill
        
        // Bonus for skill level match
        const levelPoints = {
          'Beginner': 1,
          'Intermediate': 2,
          'Advanced': 3,
          'Expert': 4
        };
        
        const candidateLevel = levelPoints[candidateSkill.level] || 1;
        const requiredLevel = levelPoints[requiredSkill.level] || 1;
        
        if (candidateLevel >= requiredLevel) {
          skillScore += 5;
        }
        
        // Weight by importance
        if (requiredSkill.importance === 'Must-have') {
          skillScore *= 1.5;
        } else if (requiredSkill.importance === 'Nice-to-have') {
          skillScore *= 0.8;
        }
        
        skillsScore += skillScore;
      }
    });
    
    score += Math.min((skillsScore / totalRequiredSkills) * 4, 40); // Max 40 points for skills
  }
  
  // Experience matching (25% of total score)
  if (candidate.experience && candidate.experience.length > 0) {
    const totalExperience = candidate.experience.reduce((total, exp) => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.isCurrent ? new Date() : new Date(exp.endDate);
      const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);
    
    if (totalExperience >= this.minExperience) {
      score += 15;
      if (!this.maxExperience || totalExperience <= this.maxExperience) {
        score += 10; // Perfect experience range
      }
    }
  }
  
  // Education matching (15% of total score)
  if (this.education && this.education.required && candidate.education && candidate.education.length > 0) {
    const hasRequiredEducation = candidate.education.some(edu => {
      if (this.education.level && edu.degree) {
        return edu.degree.toLowerCase().includes(this.education.level.toLowerCase());
      }
      return false;
    });
    
    if (hasRequiredEducation) {
      score += 15;
    }
  } else if (!this.education || !this.education.required) {
    score += 15; // No education requirement
  }
  
  // Location preference (10% of total score)
  if (this.workArrangement === 'Remote') {
    score += 10;
  } else if (candidate.location && candidate.location.city) {
    if (candidate.location.city.toLowerCase() === this.city.toLowerCase()) {
      score += 10;
    } else if (candidate.preferences && candidate.preferences.openToRelocate) {
      score += 5;
    }
  }
  
  // Salary expectation (10% of total score)
  if (candidate.preferences && candidate.preferences.salaryExpectation) {
    const jobSalary = this.fixedSalary || ((this.salaryFrom + this.salaryTo) / 2);
    const expectedSalary = (candidate.preferences.salaryExpectation.min + candidate.preferences.salaryExpectation.max) / 2;
    
    if (jobSalary >= expectedSalary * 0.9) { // Within 10% of expectation
      score += 10;
    } else if (jobSalary >= expectedSalary * 0.8) { // Within 20% of expectation
      score += 5;
    }
  } else {
    score += 5; // No salary expectation specified
  }
  
  return Math.round(Math.min(score, maxScore));
};

// Pre-save middleware to extract keywords
jobSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isModified('description') || this.isModified('requiredSkills')) {
    this.extractKeywords();
    this.lastUpdated = new Date();
  }
  next();
});

export const Job = mongoose.model("Job", jobSchema);
