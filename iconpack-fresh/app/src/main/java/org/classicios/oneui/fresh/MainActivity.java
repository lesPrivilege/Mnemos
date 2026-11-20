package org.classicios.oneui.fresh;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.widget.LinearLayout;
import android.widget.TextView;
public final class MainActivity extends Activity {
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    LinearLayout root=new LinearLayout(this);root.setOrientation(1);
    root.setPadding(40,72,40,40);root.setBackgroundColor(Color.rgb(251,251,253));
    TextView title=new TextView(this);
    title.setText("Fresh iOS Icons");title.setTextSize(26);title.setTextColor(Color.rgb(20,20,28));
    root.addView(title);
    TextView hint=new TextView(this);
    hint.setText("One UI: Good Lock → Theme Park → Icon → Create New → Icon Pack → Fresh iOS Icons.\n\n" +
      "Avoid additional tray/shape effects. Missing apps retain their original icons. " +
      "Use Change Icons for individual adjustments.");
    hint.setTextSize(16);hint.setTextColor(Color.rgb(74,74,81));hint.setPadding(0,28,0,0);
    root.addView(hint);setContentView(root);
  }
}
