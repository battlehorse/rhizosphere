/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.showcase.client.books;

import com.google.gwt.ajaxloader.client.AjaxLoader;
import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JsArray;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.KeyCodes;
import com.google.gwt.event.dom.client.KeyPressEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.DialogBox;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.LazyPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.client.RhizosphereLoader;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel;
import com.rhizospherejs.gwt.client.RhizosphereOptions;
import com.rhizospherejs.gwt.client.handlers.ReadyEvent;
import com.rhizospherejs.gwt.showcase.client.resources.Resources;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Tab that demonstrates Rhizosphere integration with an external datasource.
 * In this case we feed Rhizosphere with a feed of JSON object from Google
 * Books Search.
 * <p>
 * Rhizosphere models are {@link Book} instances built from each entry in the
 * JSON feed received from Google Books Search. The visualization metamodel and
 * renderer are explicitly defined.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class BooksTab extends Composite {
  interface BooksTabUI extends UiBinder<Widget, BooksTab> {}
  private BooksTabUI ui = GWT.create(BooksTabUI.class);

  // Wraps the tab widget into a LazyPanel, so that its contents (including
  // Rhizosphere libraries) are loaded only when the tab is activated.
  private static class LazyTab extends LazyPanel {
    @Override
    protected Widget createWidget() {
      return new BooksTab();
    }
  }

  public static Widget get() {
    return new LazyTab();
  }

  @UiField
  TextBox searchInput;

  @UiField
  Button submitButton;

  @UiField
  Button clearButton;

  @UiField
  Label loadingMessage;
  
  @UiField
  Label noResultsMessage;

  @UiField
  SimplePanel rhizosphereContainer;

  private boolean searchApiLoaded;

  /**
   * The set of books extracted so far from Google Books, keying them by ther
   * id (usually their ISBN code).
   */
  private Map<String, Book> books;

  private BooksTab() {
    books = new HashMap<String, Book>();
    searchApiLoaded = false;
    initWidget(ui.createAndBindUi(this));
    Resources.INSTANCE.booksCss().ensureInjected();

    // Load the Google Book Search APIs.
    AjaxLoader.loadApi("search", "1", new Runnable() {
      public void run() {
        searchApiLoaded = true;
      }
    }, null);
  }

  @UiHandler("searchInput")
  void keyPressed(KeyPressEvent event) {
    if (KeyCodes.KEY_ENTER == event.getNativeEvent().getKeyCode()) {
      searchBooks(null);
    }
  }

  @UiHandler("clearButton")
  void clearBooks(ClickEvent event) {
    books.clear();
    rhizosphereContainer.clear();
    clearButton.setVisible(false);
    noResultsMessage.setVisible(false);
  }

  @UiHandler("submitButton")
  void searchBooks(ClickEvent event) {
    // Disable the search fields and buttons while a search is already in
    // progress.
    showSearchStarted();

    String query = searchInput.getValue();
    if (query.length() == 0) {
      return;
    }
    if (!searchApiLoaded) {
      DialogBox d = new DialogBox(true, true);
      d.setText("Still loading Book Search APIs...");
      d.center();
      return;
    }
    doNativeSearch(this, query);
  }
  
  private void showSearchStarted() {
    submitButton.setEnabled(false);
    clearButton.setEnabled(false);
    searchInput.setEnabled(false);
    noResultsMessage.setVisible(false);
    loadingMessage.setVisible(true);    
  }
  
  private void showSearchCompleted(boolean noResults) {
    submitButton.setEnabled(true);
    clearButton.setVisible(true);
    clearButton.setEnabled(true);
    searchInput.setEnabled(true);
    loadingMessage.setVisible(false);
    noResultsMessage.setVisible(noResults);
  }

  // Perform a Google Book Search via JSNI (no GWT bindings are available yet
  // for Google Book Search).
  private native void doNativeSearch(BooksTab tab, String query) /*-{
    // Create a Book Search instance.
    bookSearch = new $wnd.google.search.BookSearch();
    bookSearch.setResultSetSize(8);
    bookSearch.setNoHtmlGeneration();

    // Accumulate results.
    var results = [];
    var curpage = 0;

    // Handler triggered by a Book Search response. Will either request another
    // page of results until enough have been collected, or hand them over back
    // to GWT code.
    var handler = {
      searchDone: function() {        
        for (var i = 0; i < bookSearch.results.length; i++) {
          results.push(bookSearch.results[i]);
        }
        if (results.length > 30 || bookSearch.results.length == 0) {
          tab.@com.rhizospherejs.gwt.showcase.client.books.BooksTab::searchDone(Lcom/google/gwt/core/client/JsArray;Ljava/lang/String;)(results, query);
        } else {
          bookSearch.gotoPage(++curpage);
        }
      }
    }
    // Set searchComplete as the callback function when a search is 
    // complete.  The bookSearch object will have results in it.
    bookSearch.setSearchCompleteCallback(handler, handler.searchDone, null);

    // Specify search quer(ies)
    bookSearch.execute(query);
    
    // Include the required Google branding.
    $wnd.google.search.Search.getBranding('booksBranding');
  }-*/;

  // Callback invoked once a book search completes. Accumulates the results
  // from this search together with the ones from previous searches and update
  // the Rhizosphere visualization.
  void searchDone(final JsArray<Book> searchResults, String query) {
    for (int i = 0; i < searchResults.length(); i++) {
      Book b = searchResults.get(i);
      b.addModelIdAndQuery(query);
      if (books.containsKey(b.getBookId())) {
        GWT.log("Duplicate ISBN (" + b.getBookId() + "). Skipping.");
        continue;
      } else {
        books.put(b.getBookId(), b);
      }
    }
    if (searchResults.length() == 0) {
      showSearchCompleted(true);
    } else {
      showRhizosphere();
    }
  }

  private void showRhizosphere() {
    // Ensures that Rhizosphere libraries are loaded. No-op if they have
    // already been loaded in another tab.
    RhizosphereLoader.getInstance().ensureInjected(new Runnable() {
      @Override
      public void run() {
        // Create some default options.
        RhizosphereOptions<Book> options = RhizosphereOptions.create();
        options.setTemplate("default");
        options.setEnableHTML5History(false);

        // Create a new Rhizosphere visualization suited to display Book objects.
        Rhizosphere<Book> rhizo = new Rhizosphere<Book>(options);

        // Register an handler that will trigger once Rhizosphere is ready
        // for user interaction, at which point we re-enable search
        // functionality.
        rhizo.addReadyHandler(new ReadyEvent.Handler() {
          @Override
          public void onReady(ReadyEvent event) {
            showSearchCompleted(false);
          }
        });

        // Configure Rhizosphere to use all available space within its
        // container.        
        rhizo.setWidth("100%");
        rhizo.setHeight("100%");

        // Parses the list of books collected so far and add them to the
        // Rhizosphere visualization. At the same time, collect statistics.
        int minNumPages = Integer.MAX_VALUE;
        int maxNumPages = Integer.MIN_VALUE;
        int minPublishedYear = Integer.MAX_VALUE;
        int maxPublishedYear = Integer.MIN_VALUE;
        Set<String> queries = new HashSet<String>();
        for (Book b: books.values()) {
          rhizo.addModel(b);
          minNumPages = Math.min(minNumPages, b.getNumberOfPages());
          maxNumPages = Math.max(maxNumPages, b.getNumberOfPages());
          minPublishedYear = Math.min(minPublishedYear, b.getPublishedYear());
          maxPublishedYear = Math.max(maxPublishedYear, b.getPublishedYear());
          queries.add(b.getQuery());
        }

        // Explicitly define the visualization metamodel, defining which fields
        // the user should be able to interact with.
        RhizosphereMetaModel meta = RhizosphereMetaModel.create();
        meta.newAttribute("authors").
          setKind(RhizosphereKind.STRING).
          setLabel("Authors");
        meta.newAttribute("titleNoFormatting").
          setKind(RhizosphereKind.STRING).
          setLabel("Title");        
        meta.newAttribute("bookId").
          setKind(RhizosphereKind.STRING).
          setLabel("ISBN");
        meta.newAttribute("publishedYear").
          setKind(RhizosphereKind.RANGE).
          setLabel("Published Year").
          setRange(minPublishedYear, maxPublishedYear, 0, 0);
        meta.newAttribute("pageCount").
          setKind(RhizosphereKind.RANGE).
          setLabel("Num Pages").
          setRange(minNumPages, maxNumPages, 0, 0);
        meta.newAttribute("query").
          setKind(RhizosphereKind.CATEGORY).
          setLabel("Search query").
          setCategories(queries.toArray(new String[queries.size()]), false);

        // Registers the metamodel and renderer.
        rhizo.setMetaModel(meta);
        rhizo.setRenderer(new BookRenderer());

        // Clear the previous visualization (if any) and add the current one.
        rhizosphereContainer.clear();
        rhizosphereContainer.add(rhizo);
      }
    });
  }
}
