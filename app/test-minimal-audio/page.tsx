import MinimalAudioPlayer from '@/components/MinimalAudioPlayer';
import SimpleHighlightingPlayer from '@/components/SimpleHighlightingPlayer';

const sampleTexts = {
  short: "This is a short test of the OpenAI text to speech system.",
  medium: "The green light at the end of Daisy's dock represents Gatsby's hopes and dreams for the future. It symbolizes his quest for the American Dream and his desire to recreate the past with Daisy.",
  long: `In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. "Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven't had the advantages that you've had." He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that.`
};

export default function TestMinimalAudioPage() {
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Step 1: Minimal Audio Player Test</h1>
      <p>Testing audio playback without highlighting complexity</p>
      
      <div style={{ marginTop: '30px' }}>
        <h3>Short Text (Quick Load Test)</h3>
        <MinimalAudioPlayer text={sampleTexts.short} />
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Medium Text</h3>
        <MinimalAudioPlayer text={sampleTexts.medium} voice="nova" />
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Long Text (Load Time Test)</h3>
        <MinimalAudioPlayer text={sampleTexts.long} voice="onyx" />
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#e8f4f8',
        borderRadius: '8px'
      }}>
        <h3>What We're Testing:</h3>
        <ul>
          <li>✅ Audio loads and plays correctly</li>
          <li>✅ Load time is reasonable (not 15-20 seconds)</li>
          <li>✅ No complex state management</li>
          <li>✅ Simple play/stop functionality</li>
        </ul>
      </div>

      <hr style={{ margin: '40px 0' }} />

      <h1>Step 2: Simple Highlighting Test</h1>
      <p>Testing synchronized highlighting with simple interval-based approach</p>

      <div style={{ marginTop: '30px' }}>
        <h3>Short Text with Highlighting</h3>
        <SimpleHighlightingPlayer text={sampleTexts.short} />
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Medium Text with Highlighting</h3>
        <SimpleHighlightingPlayer text={sampleTexts.medium} voice="nova" />
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#fff3cd',
        borderRadius: '8px'
      }}>
        <h3>Highlighting Approach:</h3>
        <ul>
          <li>📍 Simple interval-based timing</li>
          <li>📍 Words divided evenly across audio duration</li>
          <li>📍 No complex state or race conditions</li>
          <li>📍 Visual feedback in console</li>
        </ul>
      </div>
    </div>
  );
}