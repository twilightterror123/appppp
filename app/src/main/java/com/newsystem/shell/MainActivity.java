package com.newsystem.shell;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.content.Context;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    NewSystemView ui;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.rgb(5,7,11));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );
        ui = new NewSystemView(this);
        setContentView(ui);
    }

    @Override public void onBackPressed() {
        if (ui.goHome()) return;
        super.onBackPressed();
    }

    public static class NewSystemView extends View {
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Handler h = new Handler();
        final int BG=Color.rgb(5,7,11), CARD=Color.rgb(13,18,25), CARD2=Color.rgb(19,26,35);
        final int WHITE=Color.rgb(242,247,250), MUTED=Color.rgb(151,166,176), CYAN=Color.rgb(103,232,255);
        final int BLUE=Color.rgb(88,140,255);
        int page=0; // 0 home, 1 apps, 2 quick, 3 settings, 4 notifications
        int appPage=-1;
        float downX,downY;
        boolean wifi=true, bluetooth=false, sound=true, dark=true;
        int brightness=72;
        String[] names={"KI","Fotos","Dateien","Musik","Browser","Telefon","Nachrichten","Kamera","Einstellungen","Uhr","Kalender","Galerie"};
        String[] glyph={"✦","◉","▣","♫","◌","☎","●","▣","⚙","◷","□","▤"};

        public NewSystemView(Context c){ super(c); p.setTypeface(Typeface.create("sans",Typeface.NORMAL)); stroke.setStyle(Paint.Style.STROKE); setLayerType(View.LAYER_TYPE_SOFTWARE,null); }

        float d(){ return getResources().getDisplayMetrics().density; }
        float X(float v){return v*d();}
        void fill(Canvas c,int color,float l,float t,float r,float b,float rad){
            p.setStyle(Paint.Style.FILL);p.setColor(color);c.drawRoundRect(X(l),X(t),X(r),X(b),X(rad),X(rad),p);
        }
        void text(Canvas c,String s,float size,int color,float x,float y,Paint.Align a){
            p.setStyle(Paint.Style.FILL);p.setColor(color);p.setTextSize(X(size));p.setTextAlign(a);p.setTypeface(Typeface.create("sans",Typeface.NORMAL));c.drawText(s,X(x),X(y),p);
        }
        void bold(Canvas c,String s,float size,int color,float x,float y,Paint.Align a){
            p.setStyle(Paint.Style.FILL);p.setColor(color);p.setTextSize(X(size));p.setTextAlign(a);p.setTypeface(Typeface.create("sans",Typeface.BOLD));c.drawText(s,X(x),X(y),p);
        }
        void line(Canvas c,int color,float w,float x1,float y1,float x2,float y2){
            stroke.setColor(color);stroke.setStrokeWidth(X(w));c.drawLine(X(x1),X(y1),X(x2),X(y2),stroke);
        }
        void icon(Canvas c,String g,float x,float y,float size,int color){
            bold(c,g,size,color,x,y,Paint.Align.CENTER);
        }

        @Override protected void onDraw(Canvas c){
            super.onDraw(c);
            c.drawColor(BG);
            if(page==0) home(c);
            else if(page==1) apps(c);
            else if(page==2) quick(c);
            else if(page==3) settings(c);
            else notifications(c);
            if(appPage>=0) app(c,appPage);
            invalidateDelayed();
        }

        void invalidateDelayed(){ h.postDelayed(()->invalidate(),1000); }

        void top(Canvas c){
            String time=new SimpleDateFormat("HH:mm",Locale.GERMANY).format(new Date());
            text(c,time,14,WHITE,24,31,Paint.Align.LEFT);
            text(c,"5G  ᯤ  82%",12,WHITE,getWidth()/d()-24,31,Paint.Align.RIGHT);
        }

        void wallpaper(Canvas c){
            p.setShader(new RadialGradient(X(50),X(270),X(340),new int[]{Color.rgb(12,42,55),Color.rgb(7,15,22),BG},new float[]{0,.45f,1},Shader.TileMode.CLAMP));
            c.drawRect(0,0,getWidth(),getHeight(),p); p.setShader(null);
            p.setShader(new LinearGradient(0,X(150),0,X(620),Color.TRANSPARENT,Color.argb(130,5,7,11),Shader.TileMode.CLAMP));
            c.drawRect(0,X(120),getWidth(),X(650),p);p.setShader(null);
        }

        void home(Canvas c){
            wallpaper(c); top(c);
            bold(c,"NEW SYSTEM",12,CYAN,24,67,Paint.Align.LEFT);
            text(c,"Freitag, 20. September",15,MUTED,24,91,Paint.Align.LEFT);
            bold(c,new SimpleDateFormat("HH:mm",Locale.GERMANY).format(new Date()),62,WHITE,24,158,Paint.Align.LEFT);
            text(c,"Klar · 18°C",14,MUTED,26,183,Paint.Align.LEFT);

            fill(c,Color.argb(150,19,29,38),20,210,340,282,24);
            text(c,"Heute",12,MUTED,38,235,Paint.Align.LEFT);
            bold(c,"Alles bereit.",19,WHITE,38,262,Paint.Align.LEFT);
            text(c,"NEW SYSTEM läuft stabil",12,CYAN,322,262,Paint.Align.RIGHT);

            String[] a={"KI","Fotos","Dateien","Musik","Browser","Telefon","Nachrichten","Kamera"};
            String[] g={"✦","◉","▣","♫","◌","☎","●","▣"};
            for(int i=0;i<8;i++){
                float x=43+(i%4)*82, y=340+(i/4)*92;
                appIcon(c,x,y,g[i],a[i]);
            }
            fill(c,Color.argb(210,15,22,30),20,getHeight()/d()-95,getWidth()/d()-20,getHeight()/d()-22,32);
            icon(c,"⌂",55,getHeight()/d()-54,26,WHITE);
            icon(c,"◫",getWidth()/d()/2,getHeight()/d()-54,25,WHITE);
            icon(c,"≡",getWidth()/d()-55,getHeight()/d()-54,25,WHITE);
            text(c,"Wischen ↑ für Apps",11,MUTED,getWidth()/d()/2,getHeight()/d()-7,Paint.Align.CENTER);
        }

        void appIcon(Canvas c,float x,float y,String g,String label){
            fill(c,Color.rgb(21,31,41),x-29,y-29,x+29,y+29,18);
            icon(c,g,x,y+8,25,CYAN);
            text(c,label,11,WHITE,x,y+52,Paint.Align.CENTER);
        }

        void apps(Canvas c){
            wallpaper(c); top(c);
            bold(c,"Apps",28,WHITE,24,78,Paint.Align.LEFT);
            text(c,"Alle Apps",13,MUTED,24,101,Paint.Align.LEFT);
            for(int i=0;i<names.length;i++){
                float x=47+(i%4)*82, y=150+(i/4)*100;
                appIcon(c,x,y,glyph[i],names[i]);
            }
            fill(c,Color.argb(220,14,20,28),20,getHeight()/d()-74,getWidth()/d()-20,getHeight()/d()-22,28);
            text(c,"Suche in Apps",13,MUTED,46,getHeight()/d()-43,Paint.Align.LEFT);
            icon(c,"⌕",getWidth()/d()-48,getHeight()/d()-45,23,CYAN);
        }

        void quick(Canvas c){
            c.drawColor(BG); top(c);
            bold(c,"Schnellzugriff",27,WHITE,24,78,Paint.Align.LEFT);
            text(c,"Freitag, 20. September",14,MUTED,24,102,Paint.Align.LEFT);
            fill(c,Color.rgb(16,24,33),20,125,getWidth()/d()-20,225,28);
            bold(c,"72%",26,WHITE,42,166,Paint.Align.LEFT);
            text(c,"Helligkeit",12,MUTED,42,190,Paint.Align.LEFT);
            line(c,CYAN,6,42,207,42+brightness*2.8f,207);
            tile(c,20,245,"ᯤ","WLAN",wifi); tile(c,183,245,"ᛒ","Bluetooth",bluetooth);
            tile(c,20,325,"◉","Ton",sound); tile(c,183,325,"☾","Dunkel",dark);
            tile(c,20,405,"✈","Flugmodus",false); tile(c,183,405,"⌁","Energie",true);
            bold(c,"Gerät",18,WHITE,24,510,Paint.Align.LEFT);
            text(c,"SM-T220 · Android 14",13,MUTED,24,535,Paint.Align.LEFT);
            text(c,"NEW SYSTEM 1.0",13,CYAN,getWidth()/d()-24,535,Paint.Align.RIGHT);
        }

        void tile(Canvas c,float x,float y,String g,String label,boolean on){
            fill(c,on?Color.rgb(31,71,84):CARD,x,y,x+145,y+62,20);
            icon(c,g,x+27,y+32,22,on?CYAN:WHITE);
            text(c,label,13,WHITE,x+48,y+37,Paint.Align.LEFT);
            if(on) fill(c,CYAN,x+115,y+17,x+130,y+32,8);
        }

        void settings(Canvas c){
            c.drawColor(BG); top(c);
            bold(c,"Einstellungen",28,WHITE,24,78,Paint.Align.LEFT);
            fill(c,CARD,20,100,getWidth()/d()-20,148,20);
            text(c,"⌕",18,MUTED,39,131,Paint.Align.CENTER);
            text(c,"Einstellungen durchsuchen",13,MUTED,60,130,Paint.Align.LEFT);
            setting(c,170,"◉","Verbindungen","WLAN, Bluetooth, Mobilfunk");
            setting(c,250,"☾","Anzeige","Helligkeit, Dark Mode, Schrift");
            setting(c,330,"⌁","Töne und Vibration","Lautstärke, Klingelton");
            setting(c,410,"▣","Apps","Berechtigungen, Standard-Apps");
            setting(c,490,"●","Sicherheit","Geräteschutz und Datenschutz");
            setting(c,570,"⚙","Über NEW SYSTEM","Version 1.0 · Build 001");
        }

        void setting(Canvas c,float y,String g,String a,String b){
            icon(c,g,42,y+25,22,CYAN); bold(c,a,15,WHITE,72,y+19,Paint.Align.LEFT); text(c,b,12,MUTED,72,y+40,Paint.Align.LEFT); text(c,"›",25,MUTED,getWidth()/d()-30,y+30,Paint.Align.CENTER);
        }

        void notifications(Canvas c){
            c.drawColor(BG); top(c);
            bold(c,"Benachrichtigungen",27,WHITE,24,78,Paint.Align.LEFT);
            notif(c,130,"NEW SYSTEM","System bereit","Alles läuft normal.");
            notif(c,220,"Fotos","Neue Erinnerungen","Deine Galerie ist verfügbar.");
            notif(c,310,"Musik","Bereit","Kein Titel wird gerade abgespielt.");
            notif(c,400,"KI","NEW SYSTEM AI","Tippe zum Öffnen.");
        }

        void notif(Canvas c,float y,String a,String b,String d){
            fill(c,CARD,20,y,getWidth()/d()-20,y+72,22);
            icon(c,"•",44,y+34,24,CYAN);
            bold(c,a,12,CYAN,66,y+25,Paint.Align.LEFT);
            bold(c,b,14,WHITE,66,y+47,Paint.Align.LEFT);
            text(c,d,11,MUTED,getWidth()/d()-36,y+47,Paint.Align.RIGHT);
        }

        void app(Canvas c,int id){
            fill(c,Color.argb(250,5,7,11),0,0,getWidth()/d(),getHeight()/d(),0);
            top(c);
            String title=names[id];
            bold(c,title,28,WHITE,24,82,Paint.Align.LEFT);
            text(c,"NEW SYSTEM",11,CYAN,getWidth()/d()-24,82,Paint.Align.RIGHT);
            if(id==0) ai(c); else if(id==1||id==11) photos(c); else if(id==2) files(c); else if(id==3) music(c); else if(id==4) browser(c); else if(id==5) phone(c); else if(id==6) messages(c); else if(id==7) camera(c); else if(id==8) settings(c); else generic(c,title);
            text(c,"‹  Zurück",13,MUTED,24,getHeight()/d()-34,Paint.Align.LEFT);
        }

        void ai(Canvas c){
            fill(c,CARD,20,110,getWidth()/d()-20,220,25); bold(c,"NEW SYSTEM AI",20,CYAN,42,150,Paint.Align.LEFT); text(c,"Wie kann ich helfen?",14,WHITE,42,180,Paint.Align.LEFT);
            fill(c,CARD2,20,245,getWidth()/d()-20,300,22); text(c,"Nachricht eingeben …",13,MUTED,40,279,Paint.Align.LEFT);
            fill(c,CYAN,40,325,getWidth()/d()-40,380,24); bold(c,"Starten",14,BG,getWidth()/d()/2,360,Paint.Align.CENTER);
        }
        void photos(Canvas c){
            text(c,"Alle Fotos",14,MUTED,24,110,Paint.Align.LEFT);
            for(int i=0;i<12;i++){float x=28+(i%3)*111,y=135+(i/3)*105;fill(c,Color.rgb(22+(i*5)%20,35+(i*7)%25,44+(i*9)%30),x,y,x+96,y+88,18);icon(c,"✦",x+48,y+52,22,CYAN);}
        }
        void files(Canvas c){
            folder(c,125,"Dokumente","12 Dateien");folder(c,205,"Downloads","8 Dateien");folder(c,285,"Bilder","64 Dateien");folder(c,365,"Musik","19 Dateien");folder(c,445,"Videos","7 Dateien");
        }
        void folder(Canvas c,float y,String a,String b){fill(c,CARD,20,y,getWidth()/d()-20,y+62,20);icon(c,"▰",48,y+34,22,CYAN);bold(c,a,14,WHITE,76,y+27,Paint.Align.LEFT);text(c,b,11,MUTED,76,y+47,Paint.Align.LEFT);}
        void music(Canvas c){icon(c,"♫",getWidth()/d()/2,205,70,CYAN);bold(c,"Keine Wiedergabe",20,WHITE,getWidth()/d()/2,310,Paint.Align.CENTER);text(c,"Wähle einen Titel aus",13,MUTED,getWidth()/d()/2,338,Paint.Align.CENTER);fill(c,CARD,40,390,getWidth()/d()-40,445,24);text(c,"◀    ▶    ▶",24,WHITE,getWidth()/d()/2,426,Paint.Align.CENTER);}
        void browser(Canvas c){fill(c,CARD,20,110,getWidth()/d()-20,160,20);text(c,"https://new.system",13,MUTED,40,142,Paint.Align.LEFT);bold(c,"NEW SYSTEM",34,WHITE,getWidth()/d()/2,260,Paint.Align.CENTER);text(c,"Schneller, privater, clean.",14,CYAN,getWidth()/d()/2,292,Paint.Align.CENTER);}
        void phone(Canvas c){text(c,"123",32,WHITE,getWidth()/d()/2,180,Paint.Align.CENTER);String[] n={"1","2","3","4","5","6","7","8","9","*","0","#"};for(int i=0;i<12;i++){float x=90+(i%3)*70,y=235+(i/3)*65;fill(c,CARD,x-24,y-24,x+24,y+24,24);text(c,n[i],20,WHITE,x,y+7,Paint.Align.CENTER);}fill(c,CYAN,115,505,205,560,28);icon(c,"☎",160,541,24,BG);}
        void messages(Canvas c){msg(c,130,"NEW SYSTEM","System","Dein Gerät ist bereit.");msg(c,220,"Fotos","Galerie","Neue Inhalte verfügbar.");msg(c,310,"KI","Assistant","Tippe, um zu starten.");}
        void msg(Canvas c,float y,String a,String b,String d){fill(c,CARD,20,y,getWidth()/d()-20,y+72,22);icon(c,"●",45,y+35,20,CYAN);bold(c,a,14,WHITE,70,y+27,Paint.Align.LEFT);text(c,b+" · "+d,11,MUTED,70,y+48,Paint.Align.LEFT);}
        void camera(Canvas c){fill(c,Color.rgb(10,14,19),20,115,getWidth()/d()-20,500,30);icon(c,"◎",getWidth()/d()/2,305,90,WHITE);fill(c,CYAN,145,525,215,595,35);}
        void generic(Canvas c,String title){text(c,title+" ist bereit.",18,WHITE,getWidth()/d()/2,210,Paint.Align.CENTER);text(c,"NEW SYSTEM Oberfläche",13,MUTED,getWidth()/d()/2,240,Paint.Align.CENTER);}

        boolean goHome(){ if(appPage>=0){appPage=-1;invalidate();return true;} if(page!=0){page=0;invalidate();return true;} return false; }

        @Override public boolean onTouchEvent(android.view.MotionEvent e){
            float x=e.getX()/d(), y=e.getY()/d();
            if(e.getAction()==MotionEvent.ACTION_DOWN){downX=x;downY=y;return true;}
            if(e.getAction()==MotionEvent.ACTION_UP){
                float dx=x-downX,dy=y-downY;
                if(Math.abs(dy)>90 && page==0 && appPage<0 && dy<0){page=1;invalidate();return true;}
                if(Math.abs(dy)>90 && page==1 && dy>0){page=0;invalidate();return true;}
                if(appPage>=0){ if(y>getHeight()/d()-80){appPage=-1;invalidate();} return true; }
                if(page==0){
                    if(y<70){page=2;invalidate();return true;}
                    if(y>getHeight()/d()-120 && x<110){page=0;return true;}
                    if(y>getHeight()/d()-120 && x>getWidth()/d()-110){page=3;invalidate();return true;}
                    if(y>315 && y<600){int col=(int)((x-14)/82),row=(int)((y-320)/92);int id=row*4+col;if(id>=0&&id<8){appPage=id;invalidate();return true;}}
                } else if(page==1){
                    if(y<115){page=0;invalidate();return true;}
                    if(y>125){int col=(int)((x-6)/82),row=(int)((y-120)/100);int id=row*4+col;if(id>=0&&id<names.length){appPage=id;invalidate();return true;}}
                } else if(page==2){
                    if(y>235&&y<315){ if(x<175)wifi=!wifi; else bluetooth=!bluetooth; invalidate(); }
                    else if(y>315&&y<395){if(x<175)sound=!sound;else dark=!dark;invalidate();}
                    else if(y<110){page=0;invalidate();}
                } else if(page==3){if(y<110){page=0;invalidate();}}
                else {if(y<110){page=0;invalidate();}}
                return true;
            }
            return true;
        }
    }
}
