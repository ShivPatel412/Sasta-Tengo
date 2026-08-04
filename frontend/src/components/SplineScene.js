import Spline from '@splinetool/react-spline';
import '../styles/SplineScene.css';

export default function SplineScene({ scene }) {
  return (
    <div className="spline-background">
      <Spline
        scene={scene || "https://prod.spline.design/sStWXVF-OFW3bMVX/scene.splinecode"} 
      />
    </div>
  );
}
