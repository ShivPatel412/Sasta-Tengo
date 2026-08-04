import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";

const ExperienceCarousel = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["1%", "-95%"]);

  const experiences = [
    {
      id: 1,
      title: "Tech Startup",
      role: "Full Stack Developer",
      duration: "Jan 2023 - Dec 2023",
      description: "Developed and maintained web applications using React and Node.js, improving performance by 40%.",
      tags: ["React", "Node.js", "MongoDB"],
      color: "from-blue-500/20 to-blue-600/5",
    },
    {
      id: 2,
      title: "Digital Agency",
      role: "Web Developer",
      duration: "Jun 2022 - Dec 2022",
      description: "Designed and deployed responsive websites for 15+ clients using modern web technologies.",
      tags: ["HTML/CSS", "JavaScript", "Figma"],
      color: "from-purple-500/20 to-purple-600/5",
    },
    {
      id: 3,
      title: "E-commerce Platform",
      role: "Junior Developer",
      duration: "Mar 2022 - May 2022",
      description: "Built backend APIs using Laravel and PHP, handling 10k+ daily transactions.",
      tags: ["Laravel", "PHP", "MySQL"],
      color: "from-emerald-500/20 to-emerald-600/5",
    },
  ];

  return (
    <section ref={targetRef} className="relative h-[300vh] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#0f0e0d] to-[#0c0b0a] px-4">
        <motion.div style={{ x }} className="flex gap-8">
          {experiences.map((experience) => {
            return <ExperienceCard experience={experience} key={experience.id} />;
          })}
        </motion.div>
      </div>
    </section>
  );
};

const ExperienceCard = ({ experience }) => {
  return (
    <div
      key={experience.id}
      className="group relative h-96 w-[450px] flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 hover:border-neutral-600 transition-all duration-300 flex items-center justify-center px-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`
      }}></div>
      
      <div className="absolute inset-0 z-10 flex flex-col p-8 justify-center max-w-2xl">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex-shrink-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{experience.title}</h3>
              <p className="text-sm text-neutral-400">{experience.role}</p>
            </div>
          </div>
          
          <p className="text-xs text-neutral-500 mb-4">{experience.duration}</p>
          
          <p className="text-sm text-neutral-300 leading-relaxed mb-6">
            {experience.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {experience.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-block px-3 py-1 text-xs font-medium text-neutral-300 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 transition-all"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
};

export default ExperienceCarousel;
